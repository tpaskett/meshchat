our $db_path = "/www/meshchat/db/";
our $max_messages = 10;
our $messages_lock_file = $db_path . 'messages_lock';
our $messages_db_file = $db_path . 'messages';

our $messages_lock_fh;

sub get_messages_lock {
    open($messages_lock_fh, '<' . $messages_lock_file);

    if (flock($messages_lock_fh, 2)) {
	return;
    } else {
	return error('could not get messages lock');
    }
}

sub release_messages_lock {
    close($messages_lock_fh);
}

1;
