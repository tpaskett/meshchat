our $meshchat_path              = "/tmp/meshchat";
our $flash_path                 = "/www/meshchat/db";
our $tmpfs_max_messages_db_size = 1024 * 1024;                           # 1m
our $flash_max_messages_db_size = 50 * 1024;                             # 50k
our $max_file_storage           = 200 * 1024;                            # 2m
our $lock_file                  = $meshchat_path . '/lock';
our $flash_messages_db_file     = $flash_path . '/messages';
our $tmpfs_messages_db_file     = $meshchat_path . '/messages';
our $sync_status_file           = $meshchat_path . '/sync_status';
our $local_users_status_file    = $meshchat_path . '/users_local';
our $remote_users_status_file   = $meshchat_path . '/users_remote';
our $remote_files_file          = $meshchat_path . '/files_remote';
our $messages_version_file      = $meshchat_path . '/messages_version';
our $write_messages_to_flash    = 0;
our $local_files_dir            = $meshchat_path . '/files';
our $poll_interval              = 10;
our $non_meshchat_poll_interval = 300;

our $lock_fh;

sub get_lock {
    open( $lock_fh, '<' . $lock_file );

    if ( flock( $lock_fh, 2 ) ) {
        return;
    }
    else {
        die('could not get lock');
    }
}

sub release_lock {
    close($lock_fh);
}

sub file_md5 {
    my $file = shift;

    my $output = `md5sum $file`;

    my @parts = split( /\s/, $output );

    return $parts[0];
}

sub file_size {
    my $file = shift;

    my @stats = stat($file);

    return $stats[7];
}

sub file_epoch {
    my $file = shift;

    my @stats = stat($file);

    return $stats[9];
}

sub get_messages_db_version {
    open( VER, $messages_version_file );
    my $ver = <VER>;
    chomp($ver);
    close(VER);

    return $ver;
}

sub save_messages_db_version {
    open( VER, '>' . $messages_version_file );
    print VER messages_db_version() . "\n";
    close(VER);
}

sub messages_db_version {
    my $sum = 0;

    open( MSG, $tmpfs_messages_db_file );
    while (<MSG>) {
        my $line = $_;
        chomp($line);

        my @parts = split( "\t", $line );

        if ( $parts[0] =~ /[0-9a-f]/ ) {
            $sum += hex( $parts[0] );
        }
    }
    close(MSG);

    return $sum;
}

sub file_storage_stats {

    #my $stats = `df | grep /tmp | awk '{print $2} {print $3}'`;
    my $stats = `df | grep tmpfs | awk '{print $2} {print $3}'`;

    my ( $total, $used ) = `df | grep tmpfs | awk '{print \$2} {print \$3}'`;

    my $local_files_bytes = 0;

    get_lock();

    opendir( my $dh, $local_files_dir );
    my $file;

    while ( $file = readdir($dh) ) {
        if ( $file !~ /^\./ ) {
            $local_files_bytes += file_size( $local_files_dir . '/' . $file ),
                ;
        }
    }
    closedir($dh);

    release_lock();

    return {
        total      => $total,
        used       => $used,
        files      => $local_files_bytes,
        files_free => $max_file_storage - $local_files_bytes,
        allowed    => $max_file_storage
    };
}

1;
