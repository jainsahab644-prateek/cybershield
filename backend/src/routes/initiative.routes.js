'use strict';
const express=require('express');const c=require('../controllers/initiative.controller');const v=require('../validators/initiative.validator');const router=express.Router();router.get('/initiatives',v.validateFilters,c.publicList);router.get('/initiatives/:slug',v.validateSlug,c.publicDetail);module.exports=router;
