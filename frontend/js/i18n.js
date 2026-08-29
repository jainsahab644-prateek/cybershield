(()=>{
  'use strict';
  const en={
    home:'Home',report:'Report an incident',reportCyber:'Report a Cyber Incident',track:'Track Complaint',learn:'Learning Corner',safety:'Safety guidance',help:'Help',menu:'Menu',signIn:'Sign in',myComplaints:'My Complaints',
    heroTitle:'Not sure how to report a cyber incident?',heroSummary:'Describe what happened in simple words and CyberShield will guide you through the right reporting steps.',simpleGuidance:'Simple guidance, one step at a time',noTechnical:'No technical category knowledge needed.',
    startReport:'Start your report',startReportText:'Choose a situation or describe what happened. You can review every answer before submitting.',beforeStart:'Before You Start',keepReady:'If available, keep these ready:',readyDate:'Approximate date and time',readyScreens:'Screenshots',readySource:'Phone number, username, or website involved',readyTransaction:'Transaction or reference ID if money was involved',neverEnter:'Never enter passwords, OTPs, PINs, CVVs, or recovery codes.',
    example:'Example scenario',exampleText:'I received a message saying my electricity connection would be disconnected unless I paid immediately through a link.',useExample:'Use This Example',howWorks:'How it works',tellWhat:'Tell us what happened',getGuidance:'Get guidance',completeForm:'Complete a simple form',reviewSubmit:'Review and submit',trackStatus:'Track your status',
    commonTypes:'Common incident types',lostMoney:'I lost money or received a suspicious payment request',suspiciousLink:'I received a suspicious link or message',accountCompromised:'My account may have been compromised',pretending:'Someone is pretending to be me',harassing:'Someone is threatening or harassing me online',shopping:'I faced a problem while shopping online',notSure:"I'm not sure",
    initiatives:'Current awareness initiatives',viewAllInitiatives:'View All Initiatives',quickTips:'Quick safety tips',learningResources:'Featured safety resources',viewAll:'View All',faq:'Frequently asked questions',urgent:'Need Urgent Help?',urgentText:'CyberShield does not handle emergencies. For urgent situations, use the appropriate official emergency or cybercrime reporting channel.',
    whatHappened:'What happened?',describeSituation:'Describe the situation in simple words or choose the closest option. You stay in control of the category.',optionalAssistant:'Optional complaint assistant',describe:'Describe what happened',ownWords:'Tell us in your own words',helpChoose:'Help Me Choose',aiCaution:'Suggestions may be incorrect. You can always choose a different category.',suggestedPath:'Suggested Reporting Path',whyFit:'Why this may fit',keepInfo:'Information you may want to keep ready',continue:'Continue',chooseAnother:'Choose Another Category',pickClosest:'Pick the closest situation',
    closest:'Which option sounds closest?',selectedCategory:'Selected category',changeCategory:'Change category',whenWhere:'When and where?',incidentTitle:'Short title for the incident',tellUs:'Tell us what happened',whenHappen:'When did this happen?',whyAsk:'Why are we asking this?',dateWhy:'An approximate date and time can help organize the incident information.',whoContacted:'Who or what contacted you?',moneyLost:'Did you lose money?',amount:'Approximate amount',paymentMethod:'Payment method',transactionId:'Transaction / reference ID',yourDetails:'Your details',addEvidence:'Add screenshots or documents',reviewComplaint:'Review your complaint',saveLater:'Save and Continue Later',saved:'Draft saved in this browser.',back:'Back',submit:'Submit Complaint',required:'Required',optional:'Optional',stepOf:'Step {current} of {total}: {title}',financialCategory:'Money or payment problem',safetyCategory:'Threats, harassment, or identity misuse',otherCategory:'Account, link, or other online problem',phishingOption:'Suspicious link or message',accountOption:'Account access or security problem',impersonationOption:'Someone is pretending to be me',harassmentOption:'Threats or online harassment',shoppingOption:'Online shopping problem',otherOption:'Something else',
    submissionComplete:'Submission complete',submittedSuccess:'Complaint Submitted Successfully',saveReference:'Save this reference ID. You can use it to track the status of your complaint.',reference:'Reference ID',copy:'Copy Reference ID',next:'What happens next?',returnHome:'Return Home',reportAnother:'Report Another Incident',easy:'Was this easy to understand?',yes:'Yes',no:'No',thanks:'Thank you for your feedback.',
    trackTitle:'Track Your Complaint',trackSummary:'Enter your complaint reference ID to view its current status.',enterReference:'Enter your reference ID',currentStatus:'Current status',submitted:'Submitted',underReview:'Under Review',infoNeeded:'Information Needed',inProgress:'In Progress',resolved:'Resolved',closed:'Closed',
    chatbot:'CyberShield Assistant',citizenGuidance:'Citizen guidance',newChat:'New chat',chatWelcome:'Hi. I can help you report an incident, choose a category, prepare evidence, track a complaint, or find cyber safety guidance.',chatReport:'Help me report an incident',chatCategory:'Help me choose a category',chatEvidence:'What evidence should I prepare?',chatTrack:'Track my complaint',chatSafety:'Cyber safety help',ask:'Ask a cyber-safety or reporting question',send:'Send',askCyber:'Ask CyberShield',
    footerDisclosure:'CyberShield is an independent reimagining of the cybercrime reporting experience created for a public-service innovation challenge. It is not an official government service.'
  };

  function t(key,params={}){
    let value=(en[key]??key);
    for(const [name,replacement] of Object.entries(params)) {
      value=value.replaceAll(`{${name}}`,String(replacement));
    }
    return value;
  }

  function ensureSwitcher(){
    const existing = document.querySelector('.language-switch');
    if (existing) existing.remove();
  }

  function apply(){
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (key && en[key]) el.textContent = en[key];
    });
  }

  function init(){
    document.documentElement.lang='en';
    try { localStorage.removeItem('cybershield_language'); } catch {}
    ensureSwitcher();
    apply();
  }

  window.CyberShieldI18n={
    apply,
    ensureSwitcher,
    get language(){ return 'en'; },
    setLanguage(){ document.documentElement.lang='en'; },
    t,
    translations: { en }
  };

  if(document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',init,{once:true});
  } else {
    init();
  }
})();
