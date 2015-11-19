$(function() {
    $('#logout').on('click', function(e){
	e.preventDefault();
	Cookies.remove('meshchat');
	location.reload();
    });


});

function format_date(date) {
    var string;
    
    var year = String(date.getFullYear());

    string = date.getMonth() + '/' + date.getDate() + '/' + year.slice(-2);
    string += '<br/>';

    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? '0'+minutes : minutes;

    string += hours + ':' + minutes + ' ' + ampm;

    return string;
}
