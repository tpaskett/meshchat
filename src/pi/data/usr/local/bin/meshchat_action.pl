#!/usr/bin/perl

BEGIN { push @INC, '/www/cgi-bin', '/usr/lib/cgi-bin' }
use meshchatlib;
use meshchatconfig;

my $file = $ARGV[0];

if (!-e $file) { exit(); }

dbg "process actions $file";

open(FILE, "<$file");
my $line = <FILE>;
close(FILE);

my $actions = [];

open(ACTIONS, "<$action_conf_file");
while(<ACTIONS>) {
    chomp;

    if ($_ =~ /^#/) { next; }
    if ($_ eq '') { next; }
        
    my ($channel, $hashtag, $script, $timeout) = split(/\:/, $_);

    if ($channel eq '' ||
        $hashtag eq '' ||
        $script eq '' ||
        $timeout eq '') {
        dbg "parse error";

        action_error_log("Error parsing config line: $_");

        exit();
    }

    push(@$actions, {
        channel => $channel,
        hashtag => $hashtag,
        script => $script,
        timeout => $timeout
    });
}
close(ACTIONS);

# See if there is an action to run on this message

if (@{$actions} == 0) { exit(); }

dbg "actions found";

chomp($line);

my ($id, $epoch, $message, $call_sign, $node, $platform, $channel) = split(/\t/, $line);

# Check if we have ran actions on this message id already
my $result = `grep -P '^$id' $action_messages_log_file`;

#print "$id result = $result\n";

if ($result ne '') {
    action_error_log("Already processed message id: $id");
    exit;
}

my $log_file = '/tmp/meshchat_script.log';

foreach my $action (@$actions) {
    if ($$action{channel} eq '*' && $$action{hashtag} eq '*') {
        my $script_file = $file . '-' . hash();
        `cp $file $script_file`;
        `perl /usr/local/bin/meshchat_script.pl 'Channel * match' $$action{script} $script_file $$action{timeout} > $log_file 2>&1 &`;
     } elsif ($$action{channel} ne '*' && $channel eq $$action{channel} && $$action{hashtag} eq '*') {
        my $script_file = $file . '-' . hash();
        `cp $file $script_file`;
        `perl /usr/local/bin/meshchat_script.pl 'Channel $$action{channel} match' $$action{script} $script_file $$action{timeout} > $log_file 2>&1 &`;
    } elsif ($$action{channel} eq '*' && $$action{hashtag} ne '' && $message =~ /#$$action{hashtag}/) {
        my $script_file = $file . '-' . hash();
        `cp $file $script_file`;
        `perl /usr/local/bin/meshchat_script.pl '#$$action{hashtag} match' $$action{script} $script_file $$action{timeout} > $log_file 2>&1 &`;        
    } elsif ($$action{channel} ne '*' && $channel eq $$action{channel} && $$action{hashtag} ne '*' && $message =~ /#$$action{hashtag}/) {
        my $script_file = $file . '-' . hash();
        `cp $file $script_file`;
        `perl /usr/local/bin/meshchat_script.pl 'Channel $$action{channel} match and #$$action{hashtag} match' $$action{script} $script_file $$action{timeout} > $log_file 2>&1 &`;  
    }
}

chmod( 0666, $log_file );

unlink($file);

# Log the message id so we don't repeat actions on messages already processed.
# This could happen on new installs, or if the db was deleted the re-sync'd

open(LOG, ">>$action_messages_log_file");
print LOG "$id\n";
close(LOG);
