--
-- PostgreSQL database dump
--

\restrict WMHkR8pUkPlyLjmX7imSowK99TV8cPEMKMz6jGQvYVsyuRG5kms3GsKqdCeyxPA

-- Dumped from database version 18.3 (Homebrew)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analysis_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analysis_results (
    id integer NOT NULL,
    analysis_id integer NOT NULL,
    employee_name text NOT NULL,
    department text,
    manager_remarks text,
    ai_summary text,
    recommended_skills json,
    matched_course_ids json,
    suggested_trainings json,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: analysis_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.analysis_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: analysis_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.analysis_results_id_seq OWNED BY public.analysis_results.id;


--
-- Name: app_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_sessions (
    sid text NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


--
-- Name: assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assessments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    course_id integer NOT NULL,
    module_id integer NOT NULL,
    score double precision NOT NULL,
    answers json,
    submitted_at timestamp without time zone DEFAULT now()
);


--
-- Name: assessments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assessments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assessments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assessments_id_seq OWNED BY public.assessments.id;


--
-- Name: audio_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audio_uploads (
    id integer NOT NULL,
    user_id integer NOT NULL,
    filename text NOT NULL,
    file_path text NOT NULL,
    audio_url text,
    transcript text,
    mindmap_data json,
    status text DEFAULT 'uploading'::text NOT NULL,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


--
-- Name: audio_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audio_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audio_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audio_uploads_id_seq OWNED BY public.audio_uploads.id;


--
-- Name: course_concept_graphs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_concept_graphs (
    id integer NOT NULL,
    course_id integer NOT NULL,
    mermaid text NOT NULL,
    status text DEFAULT 'ready'::text NOT NULL,
    nodes json,
    edges json,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: course_concept_graphs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.course_concept_graphs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: course_concept_graphs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.course_concept_graphs_id_seq OWNED BY public.course_concept_graphs.id;


--
-- Name: course_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_modules (
    id integer NOT NULL,
    course_id integer,
    title text NOT NULL,
    content text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    quiz text,
    audio_url text,
    images json
);


--
-- Name: course_modules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.course_modules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: course_modules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.course_modules_id_seq OWNED BY public.course_modules.id;


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now(),
    objectives text[],
    audience text,
    depth text,
    generation_status text,
    generation_progress text
);


--
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id integer NOT NULL,
    user_id integer,
    course_id integer,
    status text DEFAULT 'assigned'::text NOT NULL,
    progress_pct integer DEFAULT 0 NOT NULL,
    started_at timestamp without time zone,
    completed_at timestamp without time zone
);


--
-- Name: enrollments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.enrollments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: enrollments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.enrollments_id_seq OWNED BY public.enrollments.id;


--
-- Name: exam_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_attempts (
    id integer NOT NULL,
    exam_paper_id integer NOT NULL,
    user_id integer NOT NULL,
    image_urls json NOT NULL,
    score integer,
    total_marks integer,
    evaluation_text text,
    submitted_at timestamp without time zone DEFAULT now()
);


--
-- Name: exam_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_attempts_id_seq OWNED BY public.exam_attempts.id;


--
-- Name: exam_paper_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_paper_configs (
    id integer NOT NULL,
    exam_paper_id integer NOT NULL,
    blooms_distribution json,
    question_format text DEFAULT 'mixed'::text NOT NULL,
    notify_user_ids json,
    live_enabled boolean DEFAULT false NOT NULL,
    live_duration_minutes integer DEFAULT 30 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: exam_paper_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_paper_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_paper_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_paper_configs_id_seq OWNED BY public.exam_paper_configs.id;


--
-- Name: exam_papers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_papers (
    id integer NOT NULL,
    course_id integer NOT NULL,
    generated_by integer NOT NULL,
    questions json NOT NULL,
    total_marks integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: exam_papers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.exam_papers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: exam_papers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.exam_papers_id_seq OWNED BY public.exam_papers.id;


--
-- Name: learner_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learner_profiles (
    id integer NOT NULL,
    user_id integer NOT NULL,
    knowledge_level text DEFAULT 'beginner'::text NOT NULL,
    avg_quiz_score double precision DEFAULT '0'::double precision NOT NULL,
    total_modules_completed integer DEFAULT 0 NOT NULL,
    struggle_topics json,
    strong_topics json,
    preferred_pace text DEFAULT 'normal'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: learner_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.learner_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: learner_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.learner_profiles_id_seq OWNED BY public.learner_profiles.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


--
-- Name: speaking_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speaking_lessons (
    id integer NOT NULL,
    topic_id integer NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    difficulty_level integer NOT NULL,
    prompt_template_en text NOT NULL,
    prompt_template_hi text,
    prompt_template_mr text,
    target_vocabulary json,
    example_response text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: speaking_lessons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.speaking_lessons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: speaking_lessons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.speaking_lessons_id_seq OWNED BY public.speaking_lessons.id;


--
-- Name: speaking_practices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speaking_practices (
    id integer NOT NULL,
    user_id integer,
    lesson_id integer,
    prompt text NOT NULL,
    transcript text,
    audio_url text,
    pronunciation_score double precision,
    fluency_score double precision,
    vocabulary_score double precision,
    grammar_score double precision,
    feedback text,
    corrections text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: speaking_practices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.speaking_practices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: speaking_practices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.speaking_practices_id_seq OWNED BY public.speaking_practices.id;


--
-- Name: speaking_topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speaking_topics (
    id integer NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: speaking_topics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.speaking_topics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: speaking_topics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.speaking_topics_id_seq OWNED BY public.speaking_topics.id;


--
-- Name: tutor_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutor_messages (
    id integer NOT NULL,
    user_id integer NOT NULL,
    course_id integer NOT NULL,
    module_id integer,
    role text NOT NULL,
    content text NOT NULL,
    audio_url text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: tutor_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tutor_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tutor_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tutor_messages_id_seq OWNED BY public.tutor_messages.id;


--
-- Name: user_lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_lesson_progress (
    id integer NOT NULL,
    user_id integer NOT NULL,
    lesson_id integer NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    best_score double precision,
    completed boolean DEFAULT false NOT NULL,
    last_practiced_at timestamp without time zone,
    completed_at timestamp without time zone
);


--
-- Name: user_lesson_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_lesson_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_lesson_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_lesson_progress_id_seq OWNED BY public.user_lesson_progress.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'employee'::text NOT NULL,
    preferred_language text DEFAULT 'en'::text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: workflow_analyses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workflow_analyses (
    id integer NOT NULL,
    created_by integer,
    filename text NOT NULL,
    status text DEFAULT 'processing'::text NOT NULL,
    column_mapping json,
    total_employees integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    completed_at timestamp without time zone
);


--
-- Name: workflow_analyses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workflow_analyses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workflow_analyses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workflow_analyses_id_seq OWNED BY public.workflow_analyses.id;


--
-- Name: analysis_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_results ALTER COLUMN id SET DEFAULT nextval('public.analysis_results_id_seq'::regclass);


--
-- Name: assessments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments ALTER COLUMN id SET DEFAULT nextval('public.assessments_id_seq'::regclass);


--
-- Name: audio_uploads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_uploads ALTER COLUMN id SET DEFAULT nextval('public.audio_uploads_id_seq'::regclass);


--
-- Name: course_concept_graphs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_concept_graphs ALTER COLUMN id SET DEFAULT nextval('public.course_concept_graphs_id_seq'::regclass);


--
-- Name: course_modules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules ALTER COLUMN id SET DEFAULT nextval('public.course_modules_id_seq'::regclass);


--
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- Name: enrollments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments ALTER COLUMN id SET DEFAULT nextval('public.enrollments_id_seq'::regclass);


--
-- Name: exam_attempts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts ALTER COLUMN id SET DEFAULT nextval('public.exam_attempts_id_seq'::regclass);


--
-- Name: exam_paper_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_paper_configs ALTER COLUMN id SET DEFAULT nextval('public.exam_paper_configs_id_seq'::regclass);


--
-- Name: exam_papers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_papers ALTER COLUMN id SET DEFAULT nextval('public.exam_papers_id_seq'::regclass);


--
-- Name: learner_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_profiles ALTER COLUMN id SET DEFAULT nextval('public.learner_profiles_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: speaking_lessons id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_lessons ALTER COLUMN id SET DEFAULT nextval('public.speaking_lessons_id_seq'::regclass);


--
-- Name: speaking_practices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_practices ALTER COLUMN id SET DEFAULT nextval('public.speaking_practices_id_seq'::regclass);


--
-- Name: speaking_topics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_topics ALTER COLUMN id SET DEFAULT nextval('public.speaking_topics_id_seq'::regclass);


--
-- Name: tutor_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_messages ALTER COLUMN id SET DEFAULT nextval('public.tutor_messages_id_seq'::regclass);


--
-- Name: user_lesson_progress id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress ALTER COLUMN id SET DEFAULT nextval('public.user_lesson_progress_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: workflow_analyses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_analyses ALTER COLUMN id SET DEFAULT nextval('public.workflow_analyses_id_seq'::regclass);


--
-- Name: analysis_results analysis_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_results
    ADD CONSTRAINT analysis_results_pkey PRIMARY KEY (id);


--
-- Name: app_sessions app_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_sessions
    ADD CONSTRAINT app_sessions_pkey PRIMARY KEY (sid);


--
-- Name: assessments assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_pkey PRIMARY KEY (id);


--
-- Name: audio_uploads audio_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_uploads
    ADD CONSTRAINT audio_uploads_pkey PRIMARY KEY (id);


--
-- Name: course_concept_graphs course_concept_graphs_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_concept_graphs
    ADD CONSTRAINT course_concept_graphs_course_id_key UNIQUE (course_id);


--
-- Name: course_concept_graphs course_concept_graphs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_concept_graphs
    ADD CONSTRAINT course_concept_graphs_pkey PRIMARY KEY (id);


--
-- Name: course_modules course_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: exam_attempts exam_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_pkey PRIMARY KEY (id);


--
-- Name: exam_paper_configs exam_paper_configs_exam_paper_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_paper_configs
    ADD CONSTRAINT exam_paper_configs_exam_paper_id_key UNIQUE (exam_paper_id);


--
-- Name: exam_paper_configs exam_paper_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_paper_configs
    ADD CONSTRAINT exam_paper_configs_pkey PRIMARY KEY (id);


--
-- Name: exam_papers exam_papers_course_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_papers
    ADD CONSTRAINT exam_papers_course_id_key UNIQUE (course_id);


--
-- Name: exam_papers exam_papers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_papers
    ADD CONSTRAINT exam_papers_pkey PRIMARY KEY (id);


--
-- Name: learner_profiles learner_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_profiles
    ADD CONSTRAINT learner_profiles_pkey PRIMARY KEY (id);


--
-- Name: learner_profiles learner_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_profiles
    ADD CONSTRAINT learner_profiles_user_id_key UNIQUE (user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: speaking_lessons speaking_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_lessons
    ADD CONSTRAINT speaking_lessons_pkey PRIMARY KEY (id);


--
-- Name: speaking_practices speaking_practices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_practices
    ADD CONSTRAINT speaking_practices_pkey PRIMARY KEY (id);


--
-- Name: speaking_topics speaking_topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_topics
    ADD CONSTRAINT speaking_topics_pkey PRIMARY KEY (id);


--
-- Name: tutor_messages tutor_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_messages
    ADD CONSTRAINT tutor_messages_pkey PRIMARY KEY (id);


--
-- Name: enrollments uix_user_course; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT uix_user_course UNIQUE (user_id, course_id);


--
-- Name: user_lesson_progress user_lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workflow_analyses workflow_analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_analyses
    ADD CONSTRAINT workflow_analyses_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: idx_analysis_results_analysis_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_analysis_results_analysis_id ON public.analysis_results USING btree (analysis_id);


--
-- Name: idx_assessments_user_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assessments_user_module ON public.assessments USING btree (user_id, module_id);


--
-- Name: idx_audio_uploads_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_uploads_user_created ON public.audio_uploads USING btree (user_id, created_at);


--
-- Name: idx_course_modules_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_modules_course_id ON public.course_modules USING btree (course_id);


--
-- Name: idx_enrollments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_status ON public.enrollments USING btree (status);


--
-- Name: idx_enrollments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_enrollments_user ON public.enrollments USING btree (user_id);


--
-- Name: idx_exam_paper_configs_paper; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_paper_configs_paper ON public.exam_paper_configs USING btree (exam_paper_id);


--
-- Name: idx_lesson_progress_user_lesson; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_progress_user_lesson ON public.user_lesson_progress USING btree (user_id, lesson_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_speaking_practices_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speaking_practices_user_created ON public.speaking_practices USING btree (user_id, created_at);


--
-- Name: idx_tutor_messages_user_course_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tutor_messages_user_course_created ON public.tutor_messages USING btree (user_id, course_id, created_at);


--
-- Name: idx_workflow_analyses_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workflow_analyses_user_created ON public.workflow_analyses USING btree (created_by, created_at);


--
-- Name: analysis_results analysis_results_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analysis_results
    ADD CONSTRAINT analysis_results_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.workflow_analyses(id);


--
-- Name: assessments assessments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: assessments assessments_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.course_modules(id);


--
-- Name: assessments assessments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assessments
    ADD CONSTRAINT assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audio_uploads audio_uploads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_uploads
    ADD CONSTRAINT audio_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: course_concept_graphs course_concept_graphs_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_concept_graphs
    ADD CONSTRAINT course_concept_graphs_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: course_modules course_modules_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: courses courses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: enrollments enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: enrollments enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: exam_attempts exam_attempts_exam_paper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_exam_paper_id_fkey FOREIGN KEY (exam_paper_id) REFERENCES public.exam_papers(id) ON DELETE CASCADE;


--
-- Name: exam_attempts exam_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exam_paper_configs exam_paper_configs_exam_paper_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_paper_configs
    ADD CONSTRAINT exam_paper_configs_exam_paper_id_fkey FOREIGN KEY (exam_paper_id) REFERENCES public.exam_papers(id) ON DELETE CASCADE;


--
-- Name: exam_papers exam_papers_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_papers
    ADD CONSTRAINT exam_papers_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: exam_papers exam_papers_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_papers
    ADD CONSTRAINT exam_papers_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id);


--
-- Name: learner_profiles learner_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learner_profiles
    ADD CONSTRAINT learner_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: speaking_lessons speaking_lessons_topic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_lessons
    ADD CONSTRAINT speaking_lessons_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.speaking_topics(id);


--
-- Name: speaking_practices speaking_practices_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_practices
    ADD CONSTRAINT speaking_practices_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.speaking_lessons(id);


--
-- Name: speaking_practices speaking_practices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaking_practices
    ADD CONSTRAINT speaking_practices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: tutor_messages tutor_messages_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_messages
    ADD CONSTRAINT tutor_messages_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id);


--
-- Name: tutor_messages tutor_messages_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_messages
    ADD CONSTRAINT tutor_messages_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.course_modules(id);


--
-- Name: tutor_messages tutor_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_messages
    ADD CONSTRAINT tutor_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_lesson_progress user_lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.speaking_lessons(id);


--
-- Name: user_lesson_progress user_lesson_progress_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_lesson_progress
    ADD CONSTRAINT user_lesson_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: workflow_analyses workflow_analyses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workflow_analyses
    ADD CONSTRAINT workflow_analyses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict WMHkR8pUkPlyLjmX7imSowK99TV8cPEMKMz6jGQvYVsyuRG5kms3GsKqdCeyxPA

