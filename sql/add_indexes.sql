create index if not exists idx_canteen_orders_student on canteen_orders(student_id);
create index if not exists idx_canteen_orders_shop on canteen_orders(shop_id);
create index if not exists idx_canteen_orders_status on canteen_orders(status);

create index if not exists idx_posts_author on posts(author_id);
create index if not exists idx_posts_created on posts(created_at desc);

create index if not exists idx_listings_seller on listings(seller_id);
create index if not exists idx_listings_category on listings(category);
create index if not exists idx_listings_college on listings(college_id);

create index if not exists idx_follows_follower on follows(follower_id);
create index if not exists idx_follows_following on follows(following_id);

create index if not exists idx_notifications_user on notifications(user_id, is_read);

create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_college on profiles(college_id);

create index if not exists idx_print_orders_student on print_orders(student_id);
create index if not exists idx_print_orders_shop on print_orders(shop_id);
