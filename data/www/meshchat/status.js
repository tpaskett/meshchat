$(function() {
    load_status();
    setInterval(function(){ load_status() }, 5000);
});

function load_status() {
    $.getJSON('/cgi-bin/meshchat?action=sync_status', function(data) {
	var html = '';

	for (var i = 0; i < data.length; i++) {
	    var date = new Date(0);
	    date.setUTCSeconds(data[i].epoch);

	    html += '<tr>';
	    html += '<td>' + data[i].node + '</td>';
	    html += '<td>' + format_date(date) + '</td>';
	    html += '</tr>';
	}

	$('#sync-table').html(html);
    });
}
