'use strict';
const service=require('../services/suspiciousEvidence.service');const {sendError,sendSuccess}=require('../utils/apiResponse');const sendEvidenceFile=require('../utils/sendEvidenceFile');
async function upload(request,response,next){try{return sendSuccess(response,{statusCode:201,message:'Evidence uploaded successfully.',data:{evidence:await service.upload(request.authUser.internalId,request.params.reportId,request.files||[])}});}catch(error){return next(error);}}
function list(request,response,next){try{return sendSuccess(response,{data:{evidence:service.list(request.authUser.internalId,request.params.reportId)}});}catch(error){return next(error);}}
function get(request,response,next){try{const result=service.fileFor(request.params.reportId,request.params.evidenceId,request.authUser.internalId);return result?sendEvidenceFile(response,next,result):sendError(response,{statusCode:404,message:'Evidence not found.'});}catch(error){return next(error);}}
function getAdmin(request,response,next){try{const result=service.fileFor(request.params.reportId,request.params.evidenceId);return result?sendEvidenceFile(response,next,result):sendError(response,{statusCode:404,message:'Evidence not found.'});}catch(error){return next(error);}}
module.exports={get,getAdmin,list,upload};
