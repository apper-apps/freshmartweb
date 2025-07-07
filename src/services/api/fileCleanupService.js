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
  }

  // Start automatic cleanup service
  startCleanupService() {
    if (this.isRunning) {
      console.log('Cleanup service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting payment proof cleanup service...');
    
    // Run cleanup immediately on start
    this.performCleanup();
    
    // Schedule recurring cleanup
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.cleanupInterval);
  }

  // Stop cleanup service
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
    console.log('Payment proof cleanup service stopped');
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

// Get all payment proof files from S3/R2 services with enhanced metadata
  async getAllPaymentProofs() {
    const allFiles = [];
    
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
      
    } catch (error) {
      console.error('Error gathering S3 payment proof files:', error);
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

  // Log cleanup results
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
    
    // Send notification if significant cleanup occurred
    if (this.cleanupStats.filesDeleted > 10) {
      this.notifyAdmins(results);
    }
  }

  // Notify administrators of cleanup results
  notifyAdmins(results) {
    // In real implementation, send email or push notification
    console.log('Cleanup notification sent to administrators:', {
      message: `Payment proof cleanup completed: ${results.filesDeleted} files deleted, ${results.spaceReclaimed} space reclaimed`,
      details: results
    });
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
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const fileCleanupService = new FileCleanupService();

// Auto-start cleanup service in production
if (typeof window === 'undefined') { // Node.js environment
  fileCleanupService.startCleanupService();
}