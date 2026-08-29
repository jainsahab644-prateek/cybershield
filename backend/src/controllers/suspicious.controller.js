'use strict';

const service = require('../services/suspicious.service');
const { sendSuccess } = require('../utils/apiResponse');

function create(request,response,next){try{return sendSuccess(response,{statusCode:201,message:'Suspicious activity report submitted for demo review.',data:service.createReport(request.validatedSuspiciousReport,request.authUser,{ip:request.ip})});}catch(error){return next(error);}}
function lookup(request,response,next){try{return sendSuccess(response,{data:service.lookup(request.validatedSuspiciousLookup,{user:request.authUser,ip:request.ip})});}catch(error){return next(error);}}
function listMine(request,response,next){try{return sendSuccess(response,{data:service.listOwned(request.authUser.internalId,request.validatedSuspiciousFilters)});}catch(error){return next(error);}}
function getMine(request,response,next){try{return sendSuccess(response,{data:{report:service.getOwned(request.authUser.internalId,request.params.reportId)}});}catch(error){return next(error);}}
function listAdmin(request,response,next){try{return sendSuccess(response,{data:service.listAdmin(request.validatedSuspiciousFilters)});}catch(error){return next(error);}}
function getAdmin(request,response,next){try{return sendSuccess(response,{data:{report:service.getAdmin(request.params.reportId,request.authUser,request.ip)}});}catch(error){return next(error);}}
function updateStatus(request,response,next){try{return sendSuccess(response,{message:'Suspicious report status updated.',data:{report:service.updateStatus(request.params.reportId,request.validatedSuspiciousStatus,request.authUser,request.ip)}});}catch(error){return next(error);}}
function addNote(request,response,next){try{return sendSuccess(response,{statusCode:201,message:'Internal note added.',data:service.addNote(request.params.reportId,request.validatedSuspiciousNote,request.authUser,request.ip)});}catch(error){return next(error);}}
function stats(request,response,next){try{return sendSuccess(response,{data:{suspiciousReports:service.stats()}});}catch(error){return next(error);}}
module.exports={addNote,create,getAdmin,getMine,listAdmin,listMine,lookup,stats,updateStatus};
