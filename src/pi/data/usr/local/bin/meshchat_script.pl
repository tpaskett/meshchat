#!/usr/bin/perl

BEGIN { push @INC, '/www/cgi-bin', '/usr/lib/cgi-bin' }
use meshchatlib;
use meshchatconfig;

my $match = $ARGV[0];
my $script = $ARGV[1];
my $file = $ARGV[2];
my $timeout = $ARGV[3];

if (!-e $script) {
	action_error_log("Could not find script: $script");
    error();
}

if (!-e $file) {
	action_error_log("Could not find file: $file");
    error();
}

my $result = '';

eval { 
    local $SIG{ALRM} = sub { action_error_log("Script timeout: $script"); error(); };
 
    alarm $timeout;
 
    eval {
    	print "$script $file\n";
        $result = `$script $file`;
    };

    alarm 0;
};

alarm 0;

if (${^CHILD_ERROR_NATIVE} != 0) {
	action_error_log("Script exit error $script: $result");
	# Don't exit so the error shows up in the action log
}

# Log the result

open(FILE, "<$file");
my $line = <FILE>;
close(FILE);

#unlink($file);

get_lock();

open(LOG, ">>$action_log_file");

chomp $result;

dbg "$script\t$match\t$result";
print LOG time() . "\t$script\t$match\t$result\t" . $line;

close(LOG);

release_lock();

exit();

sub error {
	unlink($file);
	exit();
}
