'use strict';
function baseSlug(value){return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160)||'learning-guide';}
function uniqueSlug(database,table,title,excludeId=null){const base=baseSlug(title);let candidate=base;for(let suffix=2;suffix<1000;suffix+=1){const row=excludeId?database.prepare(`SELECT 1 FROM ${table} WHERE slug=? AND id<>?`).get(candidate,excludeId):database.prepare(`SELECT 1 FROM ${table} WHERE slug=?`).get(candidate);if(!row)return candidate;candidate=`${base.slice(0,155)}-${suffix}`;}throw new Error('Unable to generate a unique slug.');}
module.exports={baseSlug,uniqueSlug};
