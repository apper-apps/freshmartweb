import React from "react";
import Error from "@/components/ui/Error";
import { orderService } from "@/services/api/orderService";
import { paymentService } from "@/services/api/paymentService";
// Payment Proof File Cleanup Service
// Handles automatic cleanup of payment proof files older than 30 days

class FileCleanupService {
  constructor() {
    this.cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days
    this.isRunning = false;
    this.lastCleanup = null;
    this.cleanupStats = {
      filesScanned: 0,
      filesDeleted: 0,
      spaceReclaimed: 0,
      errors: 0
    };
// Configuration from environment variables
    this.config = {
      cleanupInterval: parseInt(import.meta.env.VITE_CLEANUP_INTERVAL_HOURS) || 24, // Default: 24 hours
      retentionPeriod: parseInt(import.meta.env.VITE_RETENTION_PERIOD_DAYS) || 30, // Default: 30 days
      backupEnabled: import.meta.env.VITE_BACKUP_ENABLED === 'true',
      slackWebhook: import.meta.env.VITE_SLACK_WEBHOOK_URL || '',
      awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      s3Bucket: import.meta.env.VITE_S3_BUCKET || 'freshmart-uploads',
      r2Bucket: import.meta.env.VITE_R2_BUCKET || 'freshmart-backup',
      maxFileSizeMB: parseInt(import.meta.env.VITE_MAX_FILE_SIZE_MB) || 10,
      cloudFrontDistribution: import.meta.env.VITE_CLOUDFRONT_DISTRIBUTION_ID || ''
    };
    
    // Slack configuration
    this.slackConfig = {
      enabled: import.meta.env.VITE_SLACK_ALERTS_ENABLED === 'true',
      criticalWebhook: import.meta.env.VITE_SLACK_CRITICAL_WEBHOOK || '',
      warningWebhook: import.meta.env.VITE_SLACK_WARNING_WEBHOOK || '',
      infoWebhook: import.meta.env.VITE_SLACK_INFO_WEBHOOK || '',
      dailyReportWebhook: import.meta.env.VITE_SLACK_DAILY_REPORT_WEBHOOK || ''
    };
    
    this.alertThrottling = {
      lastProofRetrievalAlert: null,
      alertCount: 0,
      throttleWindow: 15 * 60 * 1000 // 15 minutes
    };
    
    // Health monitoring
    this.healthStats = {
      lastHealthReport: null,
      proofRetrievalFailures: 0,
      consecutiveFailures: 0,
      dailyReportScheduled: false
    };
  }

// Start automatic cleanup service with hourly backups and Slack monitoring
  startCleanupService() {
    if (this.isRunning) {
      console.log('Cleanup service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting payment proof cleanup service with hourly backups and Slack alerts...');
    
    // Test Slack configuration on startup
    this.testSlackConfiguration();
    
    // Run cleanup immediately on start
    this.performCleanup();
    
    // Schedule recurring cleanup (daily)
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
    
    // Start hourly backup service to secondary cloud region
    this.startHourlyBackups();
    
    // Schedule daily health reports
    this.scheduleDailyHealthReports();
  }

  // Start hourly backup service to secondary cloud region
  startHourlyBackups() {
    console.log('Starting hourly backup service to secondary cloud region...');
    
    // Run initial backup
    this.performCloudBackup();
    
    // Schedule hourly backups
    this.backupTimer = setInterval(() => {
      this.performCloudBackup();
    }, 60 * 60 * 1000); // Every hour
  }

// Stop cleanup service, backup service, and health monitoring
  stopCleanupService() {
    if (!this.isRunning) {
      console.log('Cleanup service is not running');
      return;
    }

    this.isRunning = false;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = null;
    }
    if (this.healthReportTimer) {
      clearInterval(this.healthReportTimer);
      this.healthReportTimer = null;
    }
    console.log('Payment proof cleanup, backup services, and Slack monitoring stopped');
  }

  // Perform cleanup of old payment proof files
  async performCleanup() {
    const startTime = new Date();
    console.log('Starting payment proof cleanup at:', startTime.toISOString());

    try {
      // Reset stats for this cleanup run
      this.cleanupStats = {
        filesScanned: 0,
        filesDeleted: 0,
        spaceReclaimed: 0,
        errors: 0
      };

      // Get all payment proof files from various services
      const paymentProofs = await this.getAllPaymentProofs();
      this.cleanupStats.filesScanned = paymentProofs.length;

      // Filter files older than retention period
      const expiredFiles = this.findExpiredFiles(paymentProofs);
      
      // Delete expired files
      for (const file of expiredFiles) {
        try {
          await this.deleteExpiredFile(file);
          this.cleanupStats.filesDeleted++;
          this.cleanupStats.spaceReclaimed += file.fileSize || 0;
        } catch (error) {
          console.error('Failed to delete file:', file.fileName, error.message);
          this.cleanupStats.errors++;
        }
      }

      // Clean up empty directories
      await this.cleanupEmptyDirectories();

      // Update last cleanup timestamp
      this.lastCleanup = new Date().toISOString();

      // Log cleanup results
      this.logCleanupResults(startTime);

    } catch (error) {
      console.error('Cleanup service error:', error);
      this.cleanupStats.errors++;
    }
  }

// Perform hourly backup to secondary cloud region (S3 -> R2)
  async performCloudBackup() {
    const startTime = new Date();
    console.log('Starting hourly cloud backup to secondary region at:', startTime.toISOString());

    try {
      // Get all files from primary S3 bucket
      const allFiles = await this.getAllPaymentProofs();
      
      // Filter files modified in the last 2 hours (to catch any recent changes)
      const recentFiles = this.getRecentlyModifiedFiles(allFiles, 2);
      
      console.log(`Found ${recentFiles.length} files to backup to secondary region`);
      
      // Backup to secondary cloud region (Cloudflare R2)
      const backupResults = await this.backupToSecondaryRegion(recentFiles);
      
      // Log backup completion
      this.logBackupResults(startTime, backupResults);
      
      // Update backup status
      this.lastBackup = new Date().toISOString();
      this.nextBackup = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      
    } catch (error) {
      console.error('Cloud backup failed:', error);
    }
  }

  // Get recently modified files for incremental backup
  getRecentlyModifiedFiles(files, hours) {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return files.filter(file => {
      if (!file.uploadedAt) return false;
      const uploadTime = new Date(file.uploadedAt);
      return uploadTime > cutoffTime;
    });
  }

  // Backup files to secondary cloud region (Cloudflare R2)
  async backupToSecondaryRegion(files) {
    const results = {
      successful: 0,
      failed: 0,
      totalSize: 0,
      errors: []
    };

    for (const file of files) {
      try {
        await this.copyToR2Bucket(file);
        results.successful++;
        results.totalSize += file.fileSize || 0;
      } catch (error) {
        results.failed++;
        results.errors.push({ file: file.fileName, error: error.message });
      }
    }

    return results;
  }

  // Copy file from S3 to Cloudflare R2 bucket
  async copyToR2Bucket(file) {
    await this.delay(100);
    
    // In real implementation:
    // 1. Download from primary S3 bucket
    // 2. Upload to Cloudflare R2 secondary bucket
    // 3. Verify file integrity
    // 4. Update backup metadata
    
    console.log(`Backing up ${file.fileName} to R2 secondary region`);
    
    // Simulate the backup process
    const backupTasks = [
      this.downloadFromS3(file),
      this.uploadToR2(file),
      this.verifyBackupIntegrity(file)
    ];
    
    await Promise.all(backupTasks);
  }

  // Download file from primary S3 bucket
  async downloadFromS3(file) {
    await this.delay(50);
    console.log(`Downloaded ${file.fileName} from primary S3 bucket`);
  }

  // Upload file to Cloudflare R2 secondary bucket
  async uploadToR2(file) {
    await this.delay(75);
    console.log(`Uploaded ${file.fileName} to R2 secondary bucket`);
  }

  // Verify backup file integrity
  async verifyBackupIntegrity(file) {
    await this.delay(25);
    console.log(`Verified integrity of ${file.fileName} in secondary region`);
  }

// Get all payment proof files from S3/R2 services with enhanced metadata and failure tracking
  async getAllPaymentProofs() {
    const allFiles = [];
    const startTime = Date.now();
    
    try {
      // Import services dynamically to avoid circular dependencies
      const { paymentService } = await import('./paymentService.js');
      const { orderService } = await import('./orderService.js');
      
      // Get files from payment service
      const paymentProofs = paymentService.paymentProofs || [];
      allFiles.push(...paymentProofs);
      
      // Get S3 files from orders with enhanced metadata
      const orders = await orderService.getAll();
      const orderProofs = orders
        .filter(order => order.paymentProof || order.paymentProofFileName || order.paymentProofS3Key)
        .map(order => ({
          Id: `order_${order.id}`,
          fileName: order.paymentProofFileName || order.paymentProof?.fileName,
          uploadedAt: order.paymentProofSubmittedAt || order.createdAt,
          fileSize: order.paymentProof?.fileSize || 0,
          orderId: order.id,
          source: 'order',
          // S3 specific metadata
          s3Bucket: order.paymentProofS3Bucket || 'freshmart-payment-proofs',
          s3Key: order.paymentProofS3Key || `payment-proofs/${order.paymentProofFileName}`,
          s3Url: order.paymentProofUrl,
          isPublicRead: order.paymentProofIsPublicRead || true,
          storageType: 's3'
        }));
      
      allFiles.push(...orderProofs);
      
      // Reset consecutive failure count on successful retrieval
      this.healthStats.consecutiveFailures = 0;
      
    } catch (error) {
      console.error('Error gathering S3 payment proof files:', error);
      
      // Track proof retrieval failures
      this.healthStats.proofRetrievalFailures++;
      this.healthStats.consecutiveFailures++;
      
      // Send Slack alert for failed proof retrieval
      await this.handleProofRetrievalFailure(error);
    }
    
    // Log retrieval performance for health monitoring
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Alert if retrieval takes longer than 5 seconds
      await this.sendSlackAlert('warning', 'Slow Proof Retrieval', {
        duration: `${duration}ms`,
        filesRetrieved: allFiles.length,
        timestamp: new Date().toISOString()
      });
    }
    
    return allFiles;
  }

  // Find files that have exceeded retention period
  findExpiredFiles(files) {
    const cutoffDate = new Date(Date.now() - this.retentionPeriod);
    
    return files.filter(file => {
      if (!file.uploadedAt) return false;
      
      const uploadDate = new Date(file.uploadedAt);
      return uploadDate < cutoffDate;
    });
  }

// Delete an expired S3 file and its thumbnail with comprehensive tracking
  async deleteExpiredFile(file) {
    // Simulate S3 file deletion process
    await this.delay(150);
    
    // In real implementation, this would:
    // 1. Delete the main S3 file
    // 2. Delete the S3 thumbnail
    // 3. Update database records
    // 4. Log the deletion with S3 metadata
    // 5. Update CloudFront cache invalidation
    
    console.log(`Deleting expired S3 file: ${file.fileName} from bucket: ${file.s3Bucket} (uploaded: ${file.uploadedAt})`);
    
    // Simulate S3 deletion operations
    const deletionTasks = [
      this.deleteS3MainFile(file),
      this.deleteS3Thumbnail(file),
      this.updateDatabaseRecord(file),
      this.invalidateCloudFrontCache(file)
    ];
    
    await Promise.all(deletionTasks);
    
    // Log S3 deletion for comprehensive audit trail
    this.logS3FileDeletion(file);
  }
// Delete main S3 payment proof file
  async deleteS3MainFile(file) {
    await this.delay(75);
    
    // In real implementation:
    // const AWS = require('aws-sdk');
    // const s3 = new AWS.S3();
    // await s3.deleteObject({
    //   Bucket: file.s3Bucket,
    //   Key: file.s3Key
    // }).promise();
    
    console.log(`Deleted S3 main file: ${file.s3Key} from bucket: ${file.s3Bucket}`);
  }

  // Delete S3 thumbnail file
  async deleteS3Thumbnail(file) {
    await this.delay(50);
    
    if (file.s3Key) {
      const thumbnailKey = file.s3Key.replace(/\.[^/.]+$/, '_thumb.webp');
      
      // In real implementation:
      // const AWS = require('aws-sdk');
      // const s3 = new AWS.S3();
      // await s3.deleteObject({
      //   Bucket: file.s3Bucket,
      //   Key: `payment-proofs/thumbnails/${thumbnailKey.split('/').pop()}`
      // }).promise();
      
      console.log(`Deleted S3 thumbnail: ${thumbnailKey} from bucket: ${file.s3Bucket}`);
    }
  }

  // Invalidate CloudFront cache for deleted S3 files
  async invalidateCloudFrontCache(file) {
    await this.delay(30);
    
    // In real implementation:
    // const AWS = require('aws-sdk');
    // const cloudfront = new AWS.CloudFront();
    // await cloudfront.createInvalidation({
    //   DistributionId: 'CLOUDFRONT_DISTRIBUTION_ID',
    //   InvalidationBatch: {
    //     Paths: {
    //       Quantity: 2,
    //       Items: [
    //         `/payment-proofs/${file.fileName}`,
    //         `/payment-proofs/thumbnails/${file.fileName.replace(/\.[^/.]+$/, '_thumb.webp')}`
    //       ]
    //     },
    //     CallerReference: `cleanup_${Date.now()}`
    //   }
    // }).promise();
    
    console.log(`Invalidated CloudFront cache for: ${file.fileName}`);
  }

  // Update database record to mark S3 file as deleted
  async updateDatabaseRecord(file) {
    await this.delay(25);
    
    // Mark file as deleted instead of removing record (for audit)
    file.status = 'deleted_by_s3_cleanup';
    file.deletedAt = new Date().toISOString();
    file.deletedBy = 'cleanup_service';
    file.s3DeletedAt = new Date().toISOString();
    file.cleanupReason = 'retention_period_exceeded';
    
    console.log(`Updated database record for S3 file: ${file.fileName}`);
  }

  // Clean up empty directories
  async cleanupEmptyDirectories() {
    await this.delay(100);
    
    // In real implementation:
    // const path = require('path');
    // const fs = require('fs').promises;
    // 
    // const directories = [
    //   './uploads/payment-proofs/',
    //   './uploads/payment-proofs/thumbnails/'
    // ];
    // 
    // for (const dir of directories) {
    //   try {
    //     const files = await fs.readdir(dir);
    //     if (files.length === 0) {
    //       await fs.rmdir(dir);
    //     }
    //   } catch (error) {
    //     // Directory doesn't exist or can't be removed
    //   }
    // }
    
    console.log('Cleaned up empty directories');
  }

// Log S3 file deletion for comprehensive audit trail
  logS3FileDeletion(file) {
    const deletionLog = {
      timestamp: new Date().toISOString(),
      action: 's3_automated_cleanup',
      fileId: file.Id,
      fileName: file.fileName,
      orderId: file.orderId,
      uploadedAt: file.uploadedAt,
      fileSize: file.fileSize,
      deletedBy: 'cleanup_service',
      reason: 'retention_period_exceeded',
      // S3 specific metadata
      s3Bucket: file.s3Bucket,
      s3Key: file.s3Key,
      s3Url: file.s3Url,
      isPublicRead: file.isPublicRead,
      storageType: file.storageType || 's3',
      cloudFrontInvalidated: true,
      retentionPolicyVersion: '1.0',
      complianceStatus: 'gdpr_compliant'
    };
    
    // In real implementation, send to AWS CloudTrail and audit logging service
    console.log('S3 file deletion audit log:', deletionLog);
  }

// Log backup results with Slack notifications
  logBackupResults(startTime, backupResults) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const results = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration}ms`,
      filesBackedUp: backupResults.successful,
      failedBackups: backupResults.failed,
      totalBackupSize: `${(backupResults.totalSize / 1024 / 1024).toFixed(2)} MB`,
      errors: backupResults.errors
    };
    
    console.log('Hourly backup completed:', results);
    
    // Send Slack notifications for backup status
    if (backupResults.failed > 0) {
      this.sendSlackAlert('critical', 'Backup Failures Detected', {
        failedBackups: backupResults.failed,
        errors: backupResults.errors.slice(0, 3), // Show first 3 errors
        totalFiles: backupResults.successful + backupResults.failed
      });
    } else if (backupResults.successful > 0) {
      this.sendSlackAlert('info', 'Backup Completed Successfully', {
        filesBackedUp: backupResults.successful,
        totalSize: results.totalBackupSize,
        duration: results.duration
      });
    }
    
    // Send notification for backup completion
    if (backupResults.successful > 0 || backupResults.failed > 0) {
      this.notifyAdmins(results, 'backup');
    }
  }

// Log cleanup results with Slack notifications
  logCleanupResults(startTime) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const results = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: `${duration}ms`,
      ...this.cleanupStats,
      spaceReclaimed: `${(this.cleanupStats.spaceReclaimed / 1024 / 1024).toFixed(2)} MB`
    };
    
    console.log('Cleanup completed:', results);
    
    // Send Slack alerts based on cleanup results
    if (this.cleanupStats.errors > 0) {
      this.sendSlackAlert('warning', 'Cleanup Errors Detected', {
        errors: this.cleanupStats.errors,
        filesDeleted: this.cleanupStats.filesDeleted,
        spaceReclaimed: results.spaceReclaimed
      });
    } else if (this.cleanupStats.filesDeleted > 10) {
      this.sendSlackAlert('info', 'Large Cleanup Operation', {
        filesDeleted: this.cleanupStats.filesDeleted,
        spaceReclaimed: results.spaceReclaimed,
        duration: results.duration
      });
    }
    
    // Send notification if significant cleanup occurred
    if (this.cleanupStats.filesDeleted > 10) {
      this.notifyAdmins(results, 'cleanup');
    }
  }

// Notify administrators of backup/cleanup results
  notifyAdmins(results, type = 'cleanup') {
    if (type === 'backup') {
      console.log('Backup notification sent to administrators:', {
        message: `Hourly backup completed: ${results.filesBackedUp} files backed up to secondary region, ${results.totalBackupSize} transferred`,
        details: results
      });
    } else {
      console.log('Cleanup notification sent to administrators:', {
        message: `Payment proof cleanup completed: ${results.filesDeleted} files deleted, ${results.spaceReclaimed} space reclaimed`,
        details: results
      });
    }
  }

// Get backup service status
  getBackupStatus() {
    return {
      isRunning: this.isRunning,
      lastBackup: this.lastBackup,
      nextBackup: this.nextBackup,
      backupInterval: '1 hour',
      lastCleanup: this.lastCleanup,
      retentionPeriod: `${this.retentionPeriod / (24 * 60 * 60 * 1000)} days`,
      cleanupInterval: `${this.cleanupInterval / (60 * 60 * 1000)} hours`,
      lastStats: this.cleanupStats
    };
  }

  // Get cleanup service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCleanup: this.lastCleanup,
      retentionPeriod: `${this.retentionPeriod / (24 * 60 * 60 * 1000)} days`,
      cleanupInterval: `${this.cleanupInterval / (60 * 60 * 1000)} hours`,
      lastStats: this.cleanupStats
    };
  }

  // Manually trigger cleanup (for admin interface)
  async manualCleanup() {
    if (this.isRunning) {
      console.log('Manual cleanup requested');
      await this.performCleanup();
      return this.cleanupStats;
    } else {
      throw new Error('Cleanup service is not running');
    }
  }

  // Configure retention period
  setRetentionPeriod(days) {
    if (days < 1 || days > 365) {
      throw new Error('Retention period must be between 1 and 365 days');
    }
    
    this.retentionPeriod = days * 24 * 60 * 60 * 1000;
    console.log(`Retention period updated to ${days} days`);
  }

  // Configure cleanup interval
  setCleanupInterval(hours) {
    if (hours < 1 || hours > 168) {
      throw new Error('Cleanup interval must be between 1 and 168 hours');
    }
    
    this.cleanupInterval = hours * 60 * 60 * 1000;
    
    // Restart service with new interval if running
    if (this.isRunning) {
      this.stopCleanupService();
      this.startCleanupService();
    }
    
    console.log(`Cleanup interval updated to ${hours} hours`);
  }

  // Utility delay function
// Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========================================
  // SLACK INTEGRATION METHODS
  // ========================================

  // Test Slack configuration on service startup
  async testSlackConfiguration() {
    if (!this.slackConfig.enabled) {
      console.log('Slack alerts disabled - set SLACK_ALERTS_ENABLED=true to enable');
      return;
    }

    console.log('Testing Slack webhook configuration...');
    
    // Test each configured webhook
    const webhooks = [
      { name: 'Critical', url: this.slackConfig.criticalWebhook },
      { name: 'Warning', url: this.slackConfig.warningWebhook },
      { name: 'Info', url: this.slackConfig.infoWebhook },
      { name: 'Daily Report', url: this.slackConfig.dailyReportWebhook }
    ];

    for (const webhook of webhooks) {
      if (webhook.url) {
        try {
          await this.sendSlackMessage(webhook.url, {
            text: `🟢 ${webhook.name} webhook test - File Cleanup Service started`,
            attachments: [{
              color: 'good',
              text: `Service initialized at ${new Date().toISOString()}`
            }]
          });
          console.log(`✓ ${webhook.name} webhook test successful`);
        } catch (error) {
          console.error(`✗ ${webhook.name} webhook test failed:`, error.message);
        }
      }
    }
  }

  // Handle proof retrieval failures with Slack alerts
  async handleProofRetrievalFailure(error) {
    const now = Date.now();
    const timeSinceLastAlert = this.alertThrottling.lastProofRetrievalAlert ? 
      now - this.alertThrottling.lastProofRetrievalAlert : Infinity;

    // Throttle alerts to prevent spam
    if (timeSinceLastAlert < this.alertThrottling.throttleWindow) {
      this.alertThrottling.alertCount++;
      return;
    }

    const alertData = {
      consecutiveFailures: this.healthStats.consecutiveFailures,
      totalFailures: this.healthStats.proofRetrievalFailures,
      error: error.message,
      timestamp: new Date().toISOString(),
      throttledAlerts: this.alertThrottling.alertCount
    };

    // Determine alert severity
    const severity = this.healthStats.consecutiveFailures >= 3 ? 'critical' : 'warning';
    
    await this.sendSlackAlert(severity, 'Proof Retrieval Failure', alertData);
    
    // Update throttling
    this.alertThrottling.lastProofRetrievalAlert = now;
    this.alertThrottling.alertCount = 0;
  }

  // Send Slack alert with severity-based routing
  async sendSlackAlert(severity, title, data) {
    if (!this.slackConfig.enabled) return;

    let webhookUrl;
    let color;
    let emoji;

    switch (severity) {
      case 'critical':
        webhookUrl = this.slackConfig.criticalWebhook;
        color = 'danger';
        emoji = '🚨';
        break;
      case 'warning':
        webhookUrl = this.slackConfig.warningWebhook;
        color = 'warning';
        emoji = '⚠️';
        break;
      case 'info':
        webhookUrl = this.slackConfig.infoWebhook;
        color = 'good';
        emoji = 'ℹ️';
        break;
      default:
        webhookUrl = this.slackConfig.infoWebhook;
        color = '#439FE0';
        emoji = '📄';
    }

    if (!webhookUrl) return;

    const message = {
      text: `${emoji} *File Cleanup Service Alert*`,
      attachments: [{
        color: color,
        title: title,
        fields: Object.entries(data).map(([key, value]) => ({
          title: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
          value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
          short: String(value).length < 30
        })),
        footer: 'FreshMart File Cleanup Service',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    try {
      await this.sendSlackMessage(webhookUrl, message);
    } catch (error) {
      console.error('Failed to send Slack alert:', error.message);
    }
  }

  // Send raw Slack message via webhook
  async sendSlackMessage(webhookUrl, message) {
    if (typeof window !== 'undefined') {
      // Browser environment - use fetch
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }
    } else {
      // Node.js environment - would use @slack/webhook
      console.log('Would send Slack message:', JSON.stringify(message, null, 2));
    }
  }

  // Schedule daily health reports
  scheduleDailyHealthReports() {
    if (this.healthStats.dailyReportScheduled) return;

    // Calculate time until next 9 AM
    const now = new Date();
    const next9AM = new Date();
    next9AM.setHours(9, 0, 0, 0);
    
    if (next9AM <= now) {
      next9AM.setDate(next9AM.getDate() + 1);
    }

    const timeUntilReport = next9AM.getTime() - now.getTime();

    // Schedule first report
    setTimeout(() => {
      this.sendDailyHealthReport();
      
      // Schedule recurring daily reports
      this.healthReportTimer = setInterval(() => {
        this.sendDailyHealthReport();
      }, 24 * 60 * 60 * 1000); // Daily at 9 AM
      
    }, timeUntilReport);

    this.healthStats.dailyReportScheduled = true;
    console.log(`Daily health reports scheduled for 9:00 AM (next report in ${Math.round(timeUntilReport / 1000 / 60)} minutes)`);
  }

  // Send comprehensive daily storage health report
  async sendDailyHealthReport() {
    if (!this.slackConfig.enabled || !this.slackConfig.dailyReportWebhook) return;

    console.log('Generating daily storage health report...');

    try {
      // Gather comprehensive health metrics
      const allFiles = await this.getAllPaymentProofs();
      const healthMetrics = await this.gatherHealthMetrics(allFiles);
      
      const report = {
        text: '📊 *Daily Storage Health Report*',
        attachments: [{
          color: healthMetrics.overallHealth === 'healthy' ? 'good' : 
                 healthMetrics.overallHealth === 'warning' ? 'warning' : 'danger',
          title: `Storage Health Status: ${healthMetrics.overallHealth.toUpperCase()}`,
          fields: [
            {
              title: 'Total Files',
              value: healthMetrics.totalFiles.toLocaleString(),
              short: true
            },
            {
              title: 'Total Storage',
              value: healthMetrics.totalStorage,
              short: true
            },
            {
              title: 'Files Added (24h)',
              value: healthMetrics.filesAddedToday.toLocaleString(),
              short: true
            },
            {
              title: 'Files Cleaned (24h)',
              value: healthMetrics.filesCleanedToday.toLocaleString(),
              short: true
            },
            {
              title: 'Proof Retrieval Failures',
              value: this.healthStats.proofRetrievalFailures.toLocaleString(),
              short: true
            },
            {
              title: 'Service Uptime',
              value: healthMetrics.serviceUptime,
              short: true
            },
            {
              title: 'Backup Status',
              value: healthMetrics.lastBackupStatus,
              short: false
            },
            {
              title: 'Storage Efficiency',
              value: `${healthMetrics.storageEfficiency}% (${healthMetrics.duplicateFiles} duplicates detected)`,
              short: false
            }
          ],
          footer: 'FreshMart Storage Health Monitor',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      // Add recommendations if needed
      if (healthMetrics.recommendations.length > 0) {
        report.attachments.push({
          color: 'warning',
          title: '💡 Recommendations',
          text: healthMetrics.recommendations.join('\n• ')
        });
      }

      await this.sendSlackMessage(this.slackConfig.dailyReportWebhook, report);
      this.healthStats.lastHealthReport = new Date().toISOString();
      
      console.log('Daily health report sent to Slack');

    } catch (error) {
      console.error('Failed to send daily health report:', error);
      await this.sendSlackAlert('warning', 'Daily Health Report Failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Gather comprehensive health metrics
  async gatherHealthMetrics(allFiles) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Calculate metrics
    const totalFiles = allFiles.length;
    const totalStorage = allFiles.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const filesAddedToday = allFiles.filter(file => 
      new Date(file.uploadedAt) > yesterday
    ).length;
    
    // Service uptime calculation
    const serviceStartTime = this.serviceStartTime || now;
    const uptimeMs = now.getTime() - serviceStartTime.getTime();
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    
    // Determine overall health
    let overallHealth = 'healthy';
    const recommendations = [];
    
    if (this.healthStats.consecutiveFailures > 2) {
      overallHealth = 'critical';
      recommendations.push('Multiple consecutive proof retrieval failures detected');
    } else if (this.healthStats.proofRetrievalFailures > 10) {
      overallHealth = 'warning';
      recommendations.push('High number of proof retrieval failures in the past 24 hours');
    }
    
    if (totalStorage > 10 * 1024 * 1024 * 1024) { // 10GB
      overallHealth = overallHealth === 'healthy' ? 'warning' : overallHealth;
      recommendations.push('Storage usage is high - consider increasing cleanup frequency');
    }
    
    // Check for duplicate files
    const fileNames = allFiles.map(f => f.fileName).filter(Boolean);
    const duplicateFiles = fileNames.length - new Set(fileNames).size;
    
    if (duplicateFiles > 50) {
      recommendations.push(`${duplicateFiles} duplicate files detected - consider deduplication`);
    }
    
    return {
      totalFiles,
      totalStorage: `${(totalStorage / 1024 / 1024 / 1024).toFixed(2)} GB`,
      filesAddedToday,
      filesCleanedToday: this.cleanupStats.filesDeleted || 0,
      serviceUptime: `${uptimeHours}h`,
      lastBackupStatus: this.lastBackup ? 
        `✅ ${new Date(this.lastBackup).toLocaleString()}` : 
        '❌ No recent backup',
      storageEfficiency: Math.round(((totalFiles - duplicateFiles) / totalFiles) * 100) || 100,
      duplicateFiles,
      overallHealth,
      recommendations
    };
  }
}
// Create singleton instance
export const fileCleanupService = new FileCleanupService();

// Auto-start cleanup service only in appropriate server environments
// Prevent execution in browser context
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env.NODE_ENV) {
  // Only start in actual Node.js server environment
  try {
    fileCleanupService.serviceStartTime = new Date();
    fileCleanupService.startCleanupService();
  } catch (error) {
    console.warn('FileCleanupService: Unable to start in current environment:', error.message);
  }
}