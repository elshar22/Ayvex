//conference.js

var servers=null;
var pc = null;  //the peer connection (RTCPeerConnection)  (webrtc)

var inCall=false;  //state bit

var dumps = JSON.stringify;

function trace(text) 
{
	console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}





//smcclure
var telecInfo={};  //global for now bugbugSOON



//hook to make a call...
function conferenceJsHook()  //don't change this name
{
	initiateTheCall();
}

//hook to maybe receive a call...
function maybeDoTeleconf(localCopyOfItem,itemFromServer)  
{
	if (!localCopyOfItem) //bugbugSoon do we even need this here?  maybe to mark who is calling us, e.g. to paint larger or something.
		return;	
	
	var otherParty=itemFromServer.value;
	if (!otherParty || !otherParty.telecInfo)
		return;
	
	//explicitly already tested to make sure this is not us, but maybe do it again???
	
	var calleeKey = otherParty.telecInfo.callee;
	if (!inCall && calleeKey && isMe(calleeKey) )  
	{
		processAsIncomingCall(otherParty);
	}
	else if (inCall==true && otherParty.telecInfo.answer)  //might be in THIS call, so can't use that bit!!!
	{
		inCall=2;  //see below  bugbug this should be a FSM
		if (theyAreWhoWeCalled(otherParty))
			finalizeConnection(otherParty);
	}
	else if (inCall==2)
	{
		return; //already answered
	}
	else
	{
		//passthru: telecInfo, but not for us
		return;  //for good measure
	}
	
}


function hangup() 
{
	trace("Ending call");
	pc.close(); 
	pc=null;
	inCall=false;
	//bugbug video controls off, etc.
	//bugbug event driven hangup for both parties...
}




//===============end public api============



function processAsIncomingCall(callee)
{
	var currentOffer = callee.telecInfo.currentOffer;
	if (!currentOffer)
		return;
	
	if (!confirm("accept call from "+dumps(callee)+"?"))  //bugbug just the key??
		return; //ignoring it  //prolly need to record this somehow?bugbug

	if (inCall) 
		return; //busy
	inCall=true;
		
	pc=new RTCPeerConnection(servers);  //bugbug servers?
	pc.oniceconnectionstatechange = showIceConnectionStateChange; 
	
	pc.onicecandidate = gotIceCandidate;  //function(ev) { gotIceCandidate(ev,blah); } ;
	pc.onaddstream = gotRemoteStream;  //bugbug think this is remote stream, in ev.
	
	getUserMedia(
			{video:true},
			function(stream){return localResponseMedia(stream,currentOffer);},
			errorHandler
		);
}

function localResponseMedia(localStream,currentOffer)
{
	//pc.onaddstream({stream: localStream});  //calling gotRemoteStream with local???
	//show it locally
	$localVideo.prop( 'src', URL.createObjectURL(localStream) ).change();
	
	//send it to originator  (bugbug is this too early, move to createAnswer??)
	pc.addStream(localStream);
	
	
	var description=new RTCSessionDescription(currentOffer);
	pc.setRemoteDescription(description,createAnswer,errorHandler);
	

}


//bugbugNOW where???  $remoteVideo.prop('src',remoteStream).change();  //bugbugNOW needed real soon
// function streamAddedNowWhat(ev) 
// {
	// var remoteStream=ev.stream; 
	// var remoteStreamUrl=window.URL.createObjectURL(remoteStream);
	// alert("starting remoteStreamUrl="+remoteStreamUrl);
	// $remoteVideo.prop('src',remoteStreamUrl).change();  
	// //$remoteVideo.get().play();bugbug
	// alert("remote video should be playing");
// }

function createAnswer()
{
	alert("creatingAsnwer");
	pc.createAnswer(answerCreated,errorHandler);
}

function answerCreated(answer)
{
	alert("answer created");
	pc.setLocalDescription(new RTCSessionDescription(answer), function(){sendAnswer(answer)}, errorHandler);
}

function sendAnswer(answer) 
{
	alert("setting global answer");
	//alert("yay bugbug250");
    // send the answer to a server to be forwarded back to the caller (you)
	//getSelectedItem().telecInfo.answer=answer;
	telecInfo.answer=answer;
	
}
 

//answer codepath above
/////////////////////
//answer to the answer...that's below...



//note this should be a lambda from the caller bugbug
function theyAreWhoWeCalled(otherParty)
{
	return true; //bugbug for now
}

function finalizeConnection(otherParty)
{
	alert("finalizeConn")
	pc.setRemoteDescription(new RTCSessionDescription(otherParty.telecInfo.answer),successqqq,errorHandler);
}


function successqqq(returnOffer)
{
	alert("success");
}

///////////////////////////
/// init below
//bugbug try to share more code later!



function initiateTheCall() 
{
	//bugbugNOW temporarily hijack this function to test reception!!!  
	//fakeRingBugbug();
	//return;
		//end bugbugNOW
	//disable($callButton);
	//enable($hangupButton);
	//trace("Starting call");
	
	//var servers = ["stun4.l.google.com:19302"];  //need correct config format....   did this work???    later this should be list of stun servers etc???
	var servers = null;
	
	pc=new RTCPeerConnection(servers);
	pc.oniceconnectionstatechange = showIceConnectionStateChange;
	
	pc.onicecandidate = gotIceCandidate;
	pc.onaddstream = gotRemoteStream;  //for when we get the answer back!
		
	//local self video
	var constraints = {video:true, audio:true};
	inCall=true;
	getUserMedia(constraints, gotGoodLocalStream, errorHandler);
}
//THENTO
function gotGoodLocalStream(localStream) 
{
	//bugbug still needed??? 
	//window.stream = localStream; // stream available to console
	
	$localVideo.prop('muted',true).change();
	$localVideo.prop('src', window.URL.createObjectURL(localStream)).change();
		
	if (localStream.getVideoTracks().length > 0) 
	{
		trace('Using video device: ' + localStream.getVideoTracks()[0].label);
	}
	if (localStream.getAudioTracks().length > 0) 
	{
		trace('Using audio device: ' + localStream.getAudioTracks()[0].label);
	}

	pc.addStream(localStream);
	trace("Added localStream to connection");
	pc.createOffer(useLocalOffer,errorHandler);	//constraints as 3rd arg??? bugbug
}
//THENTO
function useLocalOffer(offer)
{
	//alert(dumps(offer));
	pc.setLocalDescription(new RTCSessionDescription(offer), function() {gotFirstOffer(offer)}, errorHandler);
}
//THENTO
function gotFirstOffer(offer)
{
	//trace("sending the following offer from localPeerConnection: \n" + offer);
	telecInfo.currentOffer=offer;  
	telecInfo.callee=getSelectedItem().key;  //bugbug we should have done this sooner--almost right after "v" is pushed!!!
	
	
	alert("state while postOfferSend:"+pc.iceConnectionState);

	//extra hooks for tests
	if (typeof postOfferSend=='function')
		postOfferSend(offer);
}

function gotLastOffer(offer)
{
	alert("gotLastOffer");
}




function gotIceCandidate(event) //,outgoingStream)
{
	if (!event.candidate) 
	{
		alert("probably last event candidate..."+dumps(event));
		alert("localsdp"+pc.localDescription.sdp);
		gotLastOffer();
		//pc.addStream(outgoingStream);
	}
	else
	{
		//pc.addIceCandidate(new RTCIceCandidate(event.candidate));
		alert("not sending ICE candidate: \n" + dumps(event));
	}
}

function gotRemoteStream(ev)  //note similar function elsewhere in this file  _mine
{
	var remoteStream=ev.stream; //bugbug
	//alert("gotRemoteStream"+dumps(remoteStream));
	//trace(remoteStream);
	
	var remoteStreamUrl = window.URL.createObjectURL(remoteStream);  //bugbug release all of these on hangup
	alert("remote stream url="+remoteStreamUrl);
	
	$remoteVideo.prop('src',remoteStreamUrl).change();  //bugbugNOW needed real soon   
	$remoteVideo.get().play();
}

function gotRemoteStream_his(event) {  //bugbugNOW _his
    var mediaStreamSource = context.createMediaStreamSource(event.stream);
    mediaStreamSource.connect(context.destination);
}


function showIceConnectionStateChange(ev)
{
	alert( "iceChange:"+	iceConnectionState + dumps(ev) );
}




function errorHandler(err)  //bugbug consolidate with other similars.  3 functions!
{
	trace(err);
	alert("err"+getStackTrace()+"  "+dumps(err));  //bugbug separate for separate cases????
}


function getStackTrace() 
{
	var obj = {};
	Error.captureStackTrace(obj, getStackTrace);
	return obj.stack;
}


// setTimeout(function(){
				// enable($startButton)
				// $startButton.on('click',start); //bugbug??on('click',start );  
								
				// disable($callButton);
				// $callButton.on('click',call );
				// disable($hangupButton)
				// $hangupButton.on('click',hangup);
			// },500);

			
			
			
			
			
			
			
			
			
			
			
			
			
//keep for testing...

			
// var testConfRecepJson={_id: "user_HarryPotter029", _rev: "21547-8878e4e8b0e01a49f2452902f204628f", userId: "HarryPotter029", 
	// cam: {rotate_x: 0.13962634000000002, rotate_y: 0.802851455, rotate_z: 0, x: 289, y: -292, z: -637}, 
	// mostRecentQuote: "", drawInstructions: "bilateral up100 right100 down50 left200 down50", 
	// telecInfo: {currentOffer: {sdp: 
			// "v=0\r\no=- 6749225876606550730 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS ojXoWJIee0JVKmKIHXI1KdVKbabfoLswQNK6\r\nm=audio 1 RTP/SAVPF 111 103 104 0 8 106 105 13 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:1 IN IP4 0.0.0.0\r\na=ice-ufrag:VzXufVwblH4om8MD\r\na=ice-pwd:LPzHqYW7Qx+w0BjouFcBQMYg\r\na=ice-options:google-ice\r\na=fingerprint:sha-256 3F:F6:C6:E7:3E:26:17:89:83:34:FA:F1:97:0A:3A:A9:71:B8:73:A5:C0:E3:48:7E:36:17:12:D4:3B:E8:A5:F8\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:126 telephone-event/8000\r\na=maxptime:60\r\na=ssrc:687274967 cname:/FpdTECaV19PSyat\r\na=ssrc:687274967 msid:ojXoWJIee0JVKmKIHXI1KdVKbabfoLswQNK6 aadb8e3a-82a5-482d-9bdc-d14633956928\r\na=ssrc:687274967 mslabel:ojXoWJIee0JVKmKIHXI1KdVKbabfoLswQNK6\r\na=ssrc:687274967 label:aadb8e3a-82a5-482d-9bdc-d14633956928\r\nm=video 1 RTP/SAVPF 100 116 117 96\r\nc=IN IP4 0.0.0.0\r\na=rtcp:1 IN IP4 0.0.0.0\r\na=ice-ufrag:VzXufVwblH4om8MD\r\na=ice-pwd:LPzHqYW7Qx+w0BjouFcBQMYg\r\na=ice-options:google-ice\r\na=fingerprint:sha-256 3F:F6:C6:E7:3E:26:17:89:83:34:FA:F1:97:0A:3A:A9:71:B8:73:A5:C0:E3:48:7E:36:17:12:D4:3B:E8:A5:F8\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:100 VP8/90000\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=rtcp-fb:100 goog-remb\r\na=rtpmap:116 red/90000\r\na=rtpmap:117 ulpfec/90000\r\na=rtpmap:96 rtx/90000\r\na=fmtp:96 apt=100\r\na=ssrc-group:FID 1998620391 2674792308\r\na=ssrc:1998620391 cname:/FpdTECaV19PSyat\r\na=ssrc:1998620391 msid:ojXoWJIee0JVKmKIHXI1KdVKbabfoLswQNK6 eeec1b92-9c61-49dc-8eb3-ef13da685833\r\na=ssrc:1998620391 mslabel:ojXoWJIee0JVKmKIHXI1KdVKbabfoLswQNK6\r\na=ssrc:1998620391 label:eeec1b92-9c61-49dc-8eb3-ef13da685833\r\na=ssrc:2674792308 cname:/FpdTECaV19PSyat\r\na=ssrc:2674792308 msid:ojXoWJIee0JVKmKIHXI1KdVKbabfoLswQNK6 eeec1b92-9c61-49dc-8eb3-ef13da685833\r\na=ssrc:2674792308 mslabel:ojXoWJIee0JVKmKIHXI1KdVKbabfoLswQNK6\r\na=ssrc:2674792308 label:eeec1b92-9c61-49dc-8eb3-ef13da685833\r\n"
				// , type: "offer"}, callee: "user_HarryPotter030"}, 
	// saveTime: 1413840756775};
	
	
	
// function fakeRingBugbug()
// {
	// processAsIncomingCall(testConfRecepJson);
// }

	


// function gotRemoteDescription(description)
// {
	// pc.setLocalDescription(new RTCSessionDescription(answer), function() {
        // // send the answer to a server to be forwarded back to the caller (you)



  // remotePeerConnection.setLocalDescription(description);
  // trace("Answer from remotePeerConnection: \n" + description.sdp);
  // localPeerConnection.setRemoteDescription(description);
// }

//bugbug old probably
// function gotStream(stream)
// {
  // trace("Received local stream");
  // localVideo.prop('src', URL.createObjectURL(stream));
  // localStream = stream;
  // //enable($callButton);
  // trace("called");
// }




//bugbug move these elsewhere...valuable!!!
function enable(jqButton)
{
	jqButton.prop('disabled', false).change();
}

function disable(jqButton)
{
	jqButton.prop('disabled', true).change();
}
