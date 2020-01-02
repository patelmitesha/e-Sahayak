'use strict';
 
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'ws://citizengrievanceredressal-xdpy.firebaseio.com/'
  
});

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add(`Welcome to my agent!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }
  
  function saveComplaint(agent){
    agent.add(`Forwarding your complaint, please wait`);
    
    
 	const issueFollowup = agent.getContext('registercomplaint-askissue-followup');
 	const complaintFollowup = agent.getContext('registercomplaint-followup');
    const department = complaintFollowup.parameters.Department;
    const complaint = issueFollowup.parameters.issue;
    const email = issueFollowup.parameters.email;    
    
    var db = admin.database();
    var ref = db.ref("grievances");
    var complaintRef = ref.push();

    complaintRef.set({
      	department: department,
      	complaint: complaint,
      	email: email,
      	status: 'open',
        dateofcomplaint: new Date().getTime()
    });    
    
        agent.add(`It's been forwarded`);
  }
  
  function searchComplaint(agent){	
    var db = admin.database();
    var ref = db.ref("grievances");
    var complaintRef = ref.push();
    const email = agent.parameters['email'];
    
    return ref.orderByChild('email').equalTo(email).
    once('value').then( snapshot => {	
        console.log(snapshot);
	if(!snapshot.hasChildren()){
          agent.add('No complaint registered in this email');
	} else {
	  var count=0;
	  snapshot.forEach(function(childSnapshot) {
      		var complaintData = childSnapshot.val();
        var complaintDate = new Date(complaintData.dateofcomplaint);
           	count++;
        		agent.add(`your complaint dated ${complaintDate} is ${complaintData.status}.`);
	  });
    }
    });
  }
  
  function lodgeComplaint(agent){

 	const issueFollowup = agent.getContext('registercomplaint-askissue-followup');
 	const complaintFollowup = agent.getContext('registercomplaint-followup');
    const department = complaintFollowup.parameters.Department;
    const complaint = issueFollowup.parameters.issue;
    const email = agent.parameters.email;
    agent.add(`So your complaint is ` + complaint + '. Your email is '+email+' Can i forward it to '+ department +'?');
    agent.add(new Suggestion('yes'));
    agent.add(new Suggestion('no'));
  }


  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('RegisterComplaint - askemail', lodgeComplaint);
  intentMap.set('RegisterComplaint - send - yes', saveComplaint);
  intentMap.set('complaintstatus - searchcomplaint', searchComplaint);
  
  // intentMap.set('your intent name here', yourFunctionHandler);
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
