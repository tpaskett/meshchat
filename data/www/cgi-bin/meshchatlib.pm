our $db_path = "/www/meshchat/db/";
our $tmpfs_max_messages_db_size = 1024 * 1024; # 1m
our $flash_max_messages_db_size = 50 * 1024; # 50k
our $messages_lock_file = $db_path . 'messages_lock';
our $flash_messages_db_file = $db_path . 'messages';
our $tmpfs_messages_db_file = '/tmp/messages';
our $sync_status_file = '/tmp/sync_status';
our $local_users_status_file = '/tmp/meshchat_users_local';
our $remote_users_status_file = '/tmp/meshchat_users_remote';

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

sub file_md5 {
    my $file = shift;

    my $output = `md5sum $file`;

    my @parts = split(/\s/, $output);

    return $parts[0];
}

1;
