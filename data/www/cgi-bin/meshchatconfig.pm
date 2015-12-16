our $meshchat_path              = "/tmp/meshchat";
our $flash_path                 = "/www/meshchat/db";
our $tmpfs_max_messages_db_size = 1024 * 1024;                           # 1m
our $flash_max_messages_db_size = 50 * 1024;                             # 50k
our $max_file_storage           = 2 * 1024 * 1024;                       # 2m
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
our $platform = 'aredn';

1;
