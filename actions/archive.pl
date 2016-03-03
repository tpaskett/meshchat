#!/usr/bin/perl

my $archive_file = "/tmp/archive.log";

my $file = $ARGV[0];

if (!-e $file) {
	print "Could not find file $file\n";
	exit();
}

open(FILE, "<$file");
my $line = <FILE>;
close(FILE);

open(LOG, ">>$archive_file");
print LOG $line;
close(LOG);

print "Saved to archive\n";
