var last_messages_update = epoch();
var call_sign = 'NOCALL';
var meshchat_id;
var peer;
var mediaConnection;
var enable_video = 0;

// Compatibility shim
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

$(function() {
    meshchat_init();
});

function epoch() {
    return Math.floor(new Date() / 1000);
}

function monitor_last_update() {
    var secs = epoch() - last_messages_update;
    $('#last-update').html('Last updated ' + secs + ' seconds ago');
}

function start_chat() {
    $('#logout').html('Logout ' + call_sign);
    load_messages();
    load_users();
    monitor_last_update();
    setInterval(function(){ load_messages() }, 5000);
    setInterval(function(){ load_users() }, 5000);
    setInterval(function(){ monitor_last_update() }, 2500);
}

function meshchat_init() {
    meshchat_id = Cookies.get('meshchat_id');

    if (meshchat_id == undefined) {
	Cookies.set('meshchat_id', make_id());
	meshchat_id = Cookies.get('meshchat_id');
    }

    console.log(meshchat_id);

    init_video();

    $('#submit-message').on('click', function(e){
	e.preventDefault();

	if ($('#message').val().length == 0) return;

	//$(this).prop("disabled", true);

	$.post('/cgi-bin/meshchat', { action: 'send_message', message: $('#message').val(), call_sign: call_sign }, function(response){
	    //$(this).prop("disabled", false);
	    $('#message').val('');
	    ohSnap('Message sent', 'green');
	    load_messages();
	})
    });

    $('#submit-call-sign').on('click', function(e){
	e.preventDefault();

	if ($('#call-sign').val().length == 0) return;

	call_sign = $('#call-sign').val().toUpperCase();
	Cookies.set('meshchat_call_sign', call_sign);
	$('#call-sign-container').addClass('hidden');
	$('#chat-container').removeClass('hidden');

	start_chat();
    });

    $('#hangup').on('click', function(e){
	e.preventDefault();

	mediaConnection.close();
	peer.disconnect();	
	$('#video-container').addClass('hidden');
	peer.reconnect();
    });

    $('#download-messages').on('click', function(e){
	e.preventDefault();

	location.href = '/cgi-bin/meshchat?action=messages_download';
    });

    var cookie_call_sign = Cookies.get('meshchat_call_sign');

    if (cookie_call_sign == undefined) {
	$('#call-sign-container').removeClass('hidden');
    } else {
	$('#call-sign-container').addClass('hidden');
	$('#chat-container').removeClass('hidden');	
	call_sign = cookie_call_sign;
	start_chat();
    }
}

function load_messages() {
    $.getJSON('/cgi-bin/meshchat?action=messages&call_sign=' + call_sign + '&id=' + meshchat_id, function(data) {
	var html = '';

	for (var i = 0; i < data.length; i++) {
	    var date = new Date(0);
	    date.setUTCSeconds(data[i].epoch);

	    var message = data[i].message;

	    message = message.replace(/(\r\n|\n|\r)/g,"<br/>");

	    html += '<tr>';
	    html += '<td>' + format_date(date) + '</td>';
	    html += '<td>' + message + '</td>';
	    html += '<td>' + data[i].call_sign + '</td>';
	    html += '<td><a href="http://' + data[i].node + ':8080">' + data[i].node + '</a></td>';
	    html += '</tr>';
	}

	$('#message-table').html(html);

	last_messages_update = epoch();
    });
}

function load_users() {
    $.getJSON('/cgi-bin/meshchat?action=users&call_sign=' + call_sign + '&id=' + meshchat_id, function(data) {
	var html = '';

	for (var i = 0; i < data.length; i++) {
	    var date = new Date(0);
	    
	    if ((epoch() - data[i].epoch) > 300) continue;

	    date.setUTCSeconds(data[i].epoch);

	    html += '<tr>';
	    if (enable_video == 0) {
		html += '<td>' + data[i].call_sign + '</td>';
	    } else {
		html += '<td><a href="' + data[i].id + '" onclick="start_video(\'' + data[i].id + '\');return false;">' + data[i].call_sign + '</td>';
	    }
	    html += '<td><a href="http://' + data[i].node + ':8080">' + data[i].node + '</a></td>';
	    html += '<td>' + format_date(date) + '</td>';
	    html += '</tr>';
	}

	$('#users-table').html(html);
    });
}

function init_video() {
    if (enable_video == 0) return;
    // PeerJS object
    //var peer = new Peer({ key: 'lwjd5qra8257b9', debug: 3});
    peer = new Peer(meshchat_id, { host: 'laytonwestdistrict', port: 9000, debug: 0});

    peer.on('open', function(){
	//$('#my-id').text(peer.id);
	console.log('connected to peer: ' + peer.id)
    });

    // Receiving a call
    peer.on('call', function(call){
      // Answer the call automatically (instead of prompting user) for demo purposes
	$('#video-container').removeClass('hidden');
	navigator.getUserMedia({audio: true, video: true}, function(stream){
            // Set your video displays
            $('#local-video').prop('src', URL.createObjectURL(stream));
	    
            window.localStream = stream;

	    call.answer(window.localStream);
	}, function(){ 
	    ohSnap('Video error', 'red');
	});

	//if (window.existingCall) {
	//    window.existingCall.close();
	//}

	// Wait for stream on the call, then set peer video display
	call.on('stream', function(stream){
	    console.log('got remote stream');
            $('#remote-video').prop('src', URL.createObjectURL(stream));
	});

	window.existingCall = call;
    });
    
    peer.on('error', function(err){
	ohSnap('Video error: ' + err.message, 'red');
	//alert(err.message);
      // Return to step 2 if error occurs
	//step2();
    });
}

function start_video(id) {
    // Get audio/video stream
    $('#video-container').removeClass('hidden');
    
    navigator.getUserMedia({audio: true, video: true}, function(stream){
        // Set your video displays
        $('#local-video').prop('src', URL.createObjectURL(stream));
	
        window.localStream = stream;
        //step2();
	mediaConnection = peer.call(id, window.localStream);
	
	// Hang up on an existing call if present
	//if (window.existingCall) {
	//	window.existingCall.close();
	//  }
	
	// Wait for stream on the call, then set peer video display
	mediaConnection.on('stream', function(stream){
	    console.log('got remote stream');
	    $('#remote-video').prop('src', URL.createObjectURL(stream));
	});
	
	window.existingCall = mediaConnection;
    }, function(){ 
	ohSnap('Video error', 'red');
	//$('#step1-error').show(); 
    });
}
