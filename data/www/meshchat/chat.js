var last_messages_update = epoch();
var call_sign = 'NOCALL';

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
    monitor_last_update();
    setInterval(function(){ load_messages() }, 5000);
    setInterval(function(){ monitor_last_update() }, 2500);
}

function meshchat_init() {
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

	call_sign = $('#call-sign').val();
	Cookies.set('meshchat', { call_sign: call_sign });
	$('#call-sign-container').addClass('hidden');
	$('#chat-container').removeClass('hidden');

	start_chat();
    });

    var json_cookie = Cookies.getJSON('meshchat');

    if (json_cookie == undefined) {
	$('#call-sign-container').removeClass('hidden');
    } else {
	$('#call-sign-container').addClass('hidden');
	$('#chat-container').removeClass('hidden');	
	call_sign = json_cookie.call_sign;
	start_chat();
    }
}

function load_messages() {
    $.getJSON('/cgi-bin/meshchat?action=messages', function(data) {
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
	    html += '<td>' + data[i].node + '</td>';
	    html += '</tr>';
	}

	$('#message-table').html(html);

	last_messages_update = epoch();
    });
}
