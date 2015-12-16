BEGIN { push @INC, '/www/cgi-bin' }

use meshchatconfig;

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

sub node_list {
    my %hosts;

    foreach (`cat /var/run/hosts_olsr 2>/dev/null`) {
        next unless /^\d/;
        chomp;
        ( $ip, $name, $junk, $originator, $mid, $midnum ) = split /\s+/, $_;
        next unless $originator;
        next if $originator eq "myself";
        if ( $name =~ /^dtdlink\..*$/ ) {
            $hosts{$ip}{name} = $name;
            next;
        }

        if ( defined $mid and $midnum =~ /^\#(\d+)/ ) {
            if ( !exists $hosts{$ip}{name} ) {
                $hosts{$ip}{name} = $name;
            }
            $hosts{$ip}{hide}        = 1;
            $hosts{$originator}{mid} = $1;
        }
        elsif ( $ip eq $originator ) {
            if   ( $hosts{$ip}{name} ) { $hosts{$ip}{tactical} = $name }
            else                       { $hosts{$ip}{name}     = $name }
        }
        else {
            push @{ $hosts{$originator}{hosts} }, $name;
        }
    }

    my $nodes = [];

    foreach my $host ( keys %hosts ) {
        if ( $hosts{$host}{hide} != 1 ) {
            push( @$nodes, $hosts{$host}{name} );

            #print "$hosts{$host}{name}\n";
        }
    }

    return $nodes;
}

1;
