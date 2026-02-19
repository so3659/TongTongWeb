-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chat_participants (
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  left_at timestamp with time zone,
  joined_at timestamp with time zone DEFAULT now(),
  visible_from timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_participants_pkey PRIMARY KEY (room_id, user_id),
  CONSTRAINT chat_participants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id),
  CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.chat_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  is_anonymous boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  related_post_id uuid,
  target_is_anonymous boolean DEFAULT false,
  CONSTRAINT chat_rooms_pkey PRIMARY KEY (id),
  CONSTRAINT chat_rooms_related_post_id_fkey FOREIGN KEY (related_post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.club_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT club_activities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.club_executives (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  generation numeric NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  image_url text,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT club_executives_pkey PRIMARY KEY (id)
);
CREATE TABLE public.club_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_date date NOT NULL,
  title text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT club_history_pkey PRIMARY KEY (id)
);
CREATE TABLE public.comment_likes (
  user_id uuid NOT NULL,
  comment_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (user_id, comment_id),
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id)
);
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  author_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  is_anonymous boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  like_count integer DEFAULT 0,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id),
  CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  room_id uuid,
  is_anonymous boolean DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.profiles(id),
  CONSTRAINT messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  target_post_id uuid NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['COMMENT'::text, 'REPLY'::text])),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  is_anonymous boolean DEFAULT false,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES auth.users(id),
  CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_target_post_id_fkey FOREIGN KEY (target_post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.post_likes (
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (user_id, post_id),
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['공지'::text, '자유'::text, '연습실'::text, '맛집'::text, '번개'::text, '기타'::text, '아이돌'::text])),
  title text NOT NULL,
  content text NOT NULL,
  media_urls ARRAY,
  is_anonymous boolean DEFAULT false,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  comment_count integer DEFAULT 0,
  attachments jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  nickname text UNIQUE,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  role text DEFAULT 'member'::text,
  deleted_at timestamp with time zone,
  email text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  event_type text NOT NULL CHECK (event_type = ANY (ARRAY['공연'::text, '정기모임'::text, '번개'::text, '기타'::text])),
  location text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT schedules_pkey PRIMARY KEY (id),
  CONSTRAINT schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.user_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_blocks_pkey PRIMARY KEY (id),
  CONSTRAINT user_blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.profiles(id),
  CONSTRAINT user_blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.profiles(id)
);