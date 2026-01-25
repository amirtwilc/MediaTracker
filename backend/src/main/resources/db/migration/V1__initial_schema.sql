-- Users table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    is_invisible boolean DEFAULT false,
    show_email boolean DEFAULT false,
    last_active timestamp without time zone,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Genre lookup table
CREATE TABLE genres (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Platform lookup table
CREATE TABLE platforms (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media items (master list managed by admins)
CREATE TABLE media_items (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(20) NOT NULL CHECK (category IN ('MOVIE', 'SERIES', 'GAME')),
    name VARCHAR(255) NOT NULL,
    year INT,
    avg_rating DECIMAL(3,1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, category)
);

-- Many-to-many relationship between media items and genres
CREATE TABLE media_item_genres (
    media_item_id BIGINT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    genre_id BIGINT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (media_item_id, genre_id)
);

-- Many-to-many relationship between media items and platforms
CREATE TABLE media_item_platforms (
    media_item_id BIGINT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    platform_id BIGINT NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
    PRIMARY KEY (media_item_id, platform_id)
);

-- User's personal media list
CREATE TABLE user_media_list (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_item_id BIGINT NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    experienced BOOLEAN DEFAULT FALSE,
    wish_to_reexperience BOOLEAN DEFAULT FALSE,
    rating SMALLINT CHECK (rating >= 0 AND rating <= 10),
    comment VARCHAR(100),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, media_item_id)
);

-- User follows/subscriptions
CREATE TABLE user_follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    minimum_rating_threshold SMALLINT DEFAULT 7.0 CHECK (minimum_rating_threshold >= 0 AND minimum_rating_threshold <= 10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Notifications
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    media_item_id BIGINT REFERENCES media_items(id) ON DELETE SET NULL,
    rating SMALLINT,
    rated_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, media_item_id, rating)
);

-- Spring Batch tables for CSV processing
CREATE TABLE batch_job_instance (
    job_instance_id BIGSERIAL PRIMARY KEY,
    version BIGINT,
    job_name VARCHAR(100) NOT NULL,
    job_key VARCHAR(32) NOT NULL,
    UNIQUE(job_name, job_key)
);

CREATE TABLE batch_job_execution (
    job_execution_id BIGSERIAL PRIMARY KEY,
    version BIGINT,
    job_instance_id BIGINT NOT NULL,
    create_time TIMESTAMP NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(10),
    exit_code VARCHAR(2500),
    exit_message VARCHAR(2500),
    last_updated TIMESTAMP,
    FOREIGN KEY (job_instance_id) REFERENCES batch_job_instance(job_instance_id)
);

CREATE TABLE batch_job_execution_params (
    job_execution_id BIGINT NOT NULL,
    parameter_name VARCHAR(100) NOT NULL,
    parameter_type VARCHAR(100) NOT NULL,
    parameter_value VARCHAR(2500),
    identifying CHAR(1) NOT NULL,
    FOREIGN KEY (job_execution_id) REFERENCES batch_job_execution(job_execution_id)
);

CREATE TABLE batch_step_execution (
    step_execution_id BIGSERIAL PRIMARY KEY,
    version BIGINT NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    job_execution_id BIGINT NOT NULL,
    create_time TIMESTAMP NOT NULL,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(10),
    commit_count BIGINT,
    read_count BIGINT,
    filter_count BIGINT,
    write_count BIGINT,
    read_skip_count BIGINT,
    write_skip_count BIGINT,
    process_skip_count BIGINT,
    rollback_count BIGINT,
    exit_code VARCHAR(2500),
    exit_message VARCHAR(2500),
    last_updated TIMESTAMP,
    FOREIGN KEY (job_execution_id) REFERENCES batch_job_execution(job_execution_id)
);

-- Indexes for performance
CREATE INDEX idx_users_last_active ON users(last_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_user_media_list_user ON user_media_list(user_id);
CREATE INDEX idx_user_media_list_media ON user_media_list(media_item_id);
CREATE INDEX idx_user_media_user_rating ON user_media_list(user_id, rating);
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_follows_pair ON user_follows(follower_id, following_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_media_items_name ON media_items(name);
CREATE INDEX idx_media_items_year ON media_items(year);
CREATE INDEX idx_media_items_category ON media_items(category);
CREATE INDEX idx_media_item_genres_media ON media_item_genres(media_item_id);
CREATE INDEX idx_media_item_genres_genre ON media_item_genres(genre_id);
CREATE INDEX idx_media_item_platforms_media ON media_item_platforms(media_item_id);
CREATE INDEX idx_media_item_platforms_platform ON media_item_platforms(platform_id);


-- for spring batch
CREATE SEQUENCE BATCH_JOB_SEQ START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 INCREMENT BY 1 CACHE 1;
CREATE SEQUENCE BATCH_JOB_EXECUTION_SEQ START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 INCREMENT BY 1 CACHE 1;
CREATE SEQUENCE BATCH_STEP_EXECUTION_SEQ START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 INCREMENT BY 1 CACHE 1;
CREATE SEQUENCE BATCH_JOB_EXECUTION_PARAMS_SEQ START WITH 1 MINVALUE 1 MAXVALUE 9223372036854775807 INCREMENT BY 1 CACHE 1;

CREATE TABLE BATCH_STEP_EXECUTION_CONTEXT (
    STEP_EXECUTION_ID  BIGINT        NOT NULL PRIMARY KEY,
    SHORT_CONTEXT      VARCHAR(2500) NOT NULL,
    SERIALIZED_CONTEXT TEXT,
    constraint STEP_EXEC_CTX_FK foreign key (STEP_EXECUTION_ID)
        references BATCH_STEP_EXECUTION (STEP_EXECUTION_ID)
);

CREATE TABLE BATCH_JOB_EXECUTION_CONTEXT (
    JOB_EXECUTION_ID   BIGINT        NOT NULL PRIMARY KEY,
    SHORT_CONTEXT      VARCHAR(2500) NOT NULL,
    SERIALIZED_CONTEXT TEXT,
    constraint JOB_EXEC_CTX_FK foreign key (JOB_EXECUTION_ID)
        references BATCH_JOB_EXECUTION (JOB_EXECUTION_ID)
);