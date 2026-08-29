'use strict';

const express=require('express');
const controller=require('../controllers/suspicious.controller');
const {attachAuthUser,requireAuth}=require('../middleware/requireAuth');
const {suspiciousLookupLimiter,suspiciousReportLimiter}=require('../middleware/rateLimiter');
const {validateSuspiciousLookup,validateSuspiciousReport,validateUserSuspiciousFilters}=require('../validators/suspicious.validator');
const router=express.Router();
const evidenceController=require('../controllers/suspiciousEvidence.controller');
const {createEvidenceUpload}=require('../middleware/evidenceUpload');
const {evidenceUploadLimiter}=require('../middleware/rateLimiter');
router.post('/suspicious-reports',suspiciousReportLimiter,attachAuthUser,validateSuspiciousReport,controller.create);
router.post('/suspicious-check',suspiciousLookupLimiter,attachAuthUser,validateSuspiciousLookup,controller.lookup);
router.get('/users/me/suspicious-reports',requireAuth,validateUserSuspiciousFilters,controller.listMine);
router.get('/users/me/suspicious-reports/:reportId',requireAuth,controller.getMine);
router.get('/users/me/suspicious-reports/:reportId/evidence',requireAuth,evidenceController.list);
router.get('/users/me/suspicious-reports/:reportId/evidence/:evidenceId',requireAuth,evidenceController.get);
router.post('/users/me/suspicious-reports/:reportId/evidence',requireAuth,evidenceUploadLimiter,createEvidenceUpload(),evidenceController.upload);
module.exports=router;
