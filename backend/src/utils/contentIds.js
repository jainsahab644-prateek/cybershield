'use strict';
const crypto=require('node:crypto');const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function make(prefix){const bytes=crypto.randomBytes(8);let value='';for(let index=0;index<8;index+=1)value+=alphabet[bytes[index]%alphabet.length];return`${prefix}-${value}`;}
module.exports={articleId:()=>make('ART'),categoryId:()=>make('CAT'),faqId:()=>make('FAQ'),announcementId:()=>make('ANN'),initiativeId:()=>make('INI'),tagId:()=>make('TAG'),resourceId:()=>make('RES')};
