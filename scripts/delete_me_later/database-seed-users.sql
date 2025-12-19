-- supabase/migrations/database-drop-users-seed-users.sql
--
-- DROP & SEED скрипт за тестови потребители
--
-- Този скрипт изтрива и създава 8 тестови акаунта:
-- - 3 Workers: gogata3000@gmail.com - gogata3002@gmail.com
-- - 1 Admin: gogata1905@gmail.com
-- - 4 Businesses: gogata1905@abv.bg, gogata1905@yahoo.com, gogata3003@gmail.com, gogata3004@gmail.com
-- Всички с парола: Chelsea05.
--
-- ВАЖНО: Supabase има trigger който автоматично създава profile при INSERT в auth.users
-- Затова използваме INSERT auth.users + UPDATE profiles вместо INSERT profiles
--
-- Може да се пуска многократно в Supabase SQL Editor

-- ============================================================================
-- PART 0: Cleanup старите fixed UUID записи (ако съществуват)
-- ============================================================================

-- Изтрий всички свързани записи за старите jobs (заради foreign key constraints)
DELETE FROM shifts WHERE job_id IN (
    SELECT id FROM jobs WHERE business_id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000204'
    )
);

DELETE FROM job_applications WHERE job_id IN (
    SELECT id FROM jobs WHERE business_id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000204'
    )
);

DELETE FROM reviews WHERE job_id IN (
    SELECT id FROM jobs WHERE business_id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000204'
    )
);

DELETE FROM saved_jobs WHERE job_id IN (
    SELECT id FROM jobs WHERE business_id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000204'
    )
);

DELETE FROM disputes WHERE job_id IN (
    SELECT id FROM jobs WHERE business_id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000204'
    )
);

DELETE FROM job_cancellation_fines WHERE job_id IN (
    SELECT id FROM jobs WHERE business_id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000204'
    )
);

DELETE FROM payments WHERE job_id IN (
    SELECT id FROM jobs WHERE business_id IN (
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000204'
    )
);

-- Сега можем безопасно да изтрием старите jobs
DELETE FROM jobs WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

-- Изтрий всички свързани записи към businesses (заради foreign key constraints)
DELETE FROM business_locations WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

DELETE FROM business_followers WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

DELETE FROM business_invitations WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

DELETE FROM business_consultations WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

DELETE FROM payments WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

DELETE FROM payment_transactions WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

DELETE FROM job_cancellation_fines WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

DELETE FROM business_users WHERE business_id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

-- Сега можем безопасно да изтрием businesses
DELETE FROM businesses WHERE id IN (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000204'
);

-- Изтрий payment_transactions за fixed UUID (преди recurring_plans заради FK)
DELETE FROM payment_transactions WHERE id IN (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000602'
);

-- Изтрий recurring_plans за fixed UUID
DELETE FROM recurring_plans WHERE id IN (
    '00000000-0000-0000-0000-000000000501'
);

-- Clear admin_canceled_by references in recurring_plans before deleting profiles
-- (поради FK constraint recurring_plans_admin_canceled_by_fkey)
UPDATE recurring_plans SET admin_canceled_by = NULL WHERE admin_canceled_by IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000999',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102'
);

-- Изтрий profiles за fixed UUID users
DELETE FROM profiles WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000999',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102'
);

-- Изтрий auth.identities за fixed UUID users
DELETE FROM auth.identities WHERE user_id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000999',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102'
);

-- Изтрий auth.users за fixed UUID users (CASCADE ще изтрие sessions, refresh_tokens, etc.)
DELETE FROM auth.users WHERE id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000999',
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000102'
);

-- ============================================================================
-- PART 1: DROP - Изтриване на съществуващи записи по email
-- ============================================================================

DO $$
DECLARE
    test_emails TEXT[] := ARRAY[
        'gogata3000@gmail.com',
        'gogata3001@gmail.com',
        'gogata3002@gmail.com',
        'gogata3003@gmail.com',
        'gogata3004@gmail.com',
        'gogata1905@gmail.com',
        'gogata1905@abv.bg',
        'gogata1905@yahoo.com'
    ];
    v_user_id UUID;
BEGIN
    FOR v_user_id IN
        SELECT au.id FROM auth.users au WHERE au.email = ANY(test_emails)
    LOOP
        RAISE NOTICE 'Изтриване на записи за user_id: %', v_user_id;

        -- Изтрий личните записи на потребителя
        DELETE FROM notifications WHERE user_id = v_user_id;
        DELETE FROM reviews WHERE reviewer_id = v_user_id OR reviewed_id = v_user_id;
        DELETE FROM saved_jobs WHERE user_id = v_user_id;
        DELETE FROM saved_searches WHERE user_id = v_user_id;
        DELETE FROM user_notification_preferences WHERE user_id = v_user_id;
        DELETE FROM user_tokens WHERE user_id = v_user_id;
        DELETE FROM scheduled_notifications WHERE user_id = v_user_id;
        DELETE FROM business_followers WHERE worker_id = v_user_id;
        DELETE FROM disputes WHERE reporter_id = v_user_id OR reported_id = v_user_id;
        DELETE FROM payment_transactions WHERE user_id = v_user_id;
        DELETE FROM recurring_plans WHERE user_id = v_user_id;
        DELETE FROM shifts WHERE student_id = v_user_id;
        DELETE FROM job_applications WHERE student_id = v_user_id;

        -- Изтрий всички jobs създадени от този потребител (и свързаните им записи)
        DELETE FROM shifts WHERE job_id IN (SELECT id FROM jobs WHERE posted_by = v_user_id);
        DELETE FROM job_applications WHERE job_id IN (SELECT id FROM jobs WHERE posted_by = v_user_id);
        DELETE FROM reviews WHERE job_id IN (SELECT id FROM jobs WHERE posted_by = v_user_id);
        DELETE FROM saved_jobs WHERE job_id IN (SELECT id FROM jobs WHERE posted_by = v_user_id);
        DELETE FROM disputes WHERE job_id IN (SELECT id FROM jobs WHERE posted_by = v_user_id);
        DELETE FROM payments WHERE job_id IN (SELECT id FROM jobs WHERE posted_by = v_user_id);
        DELETE FROM job_cancellation_fines WHERE job_id IN (SELECT id FROM jobs WHERE posted_by = v_user_id);
        DELETE FROM jobs WHERE posted_by = v_user_id;

        -- Изтрий businesses където потребителят е owner (и всички свързани записи)
        DELETE FROM business_locations WHERE business_id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );
        DELETE FROM business_followers WHERE business_id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );
        DELETE FROM business_invitations WHERE business_id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );
        DELETE FROM business_consultations WHERE business_id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );
        DELETE FROM payments WHERE business_id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );
        DELETE FROM payment_transactions WHERE business_id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );
        DELETE FROM job_cancellation_fines WHERE business_id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );
        DELETE FROM business_users WHERE business_id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );
        DELETE FROM businesses WHERE id IN (
            SELECT business_id FROM business_users WHERE user_id = v_user_id AND role = 'owner'
        );

        UPDATE profiles SET profile_photo_id = NULL, id_document_id = NULL WHERE id = v_user_id;
        DELETE FROM file_uploads WHERE user_id = v_user_id;
        UPDATE profiles SET referred_by = NULL WHERE referred_by = v_user_id;
        -- Clear admin_canceled_by references before deleting profile (FK constraint)
        UPDATE recurring_plans SET admin_canceled_by = NULL WHERE admin_canceled_by = v_user_id;
        DELETE FROM profiles WHERE id = v_user_id;
        DELETE FROM auth.identities WHERE user_id = v_user_id;
        DELETE FROM auth.users WHERE id = v_user_id;

        RAISE NOTICE 'Успешно изтрити всички записи за user_id: %', v_user_id;
    END LOOP;
END $$;

-- ============================================================================
-- PART 2: SEED WORKERS - Създаване на 4 worker акаунта
-- ============================================================================

-- Worker 0: gogata3000@gmail.com
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, reauthentication_token, email_change,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
) VALUES (
    '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
    'gogata3000@gmail.com', crypt('Chelsea05.', gen_salt('bf')), NOW(),
    '', '', '', '', '', '', '',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Worker0 Workov0 Workerov0"}',
    false, 'authenticated', 'authenticated'
);

INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'email',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"gogata3000@gmail.com","email_verified":true}',
    NOW(), NOW(), NOW()
);

UPDATE profiles SET
    email = 'gogata3000@gmail.com', user_type = 'worker',
    onboarding_completed = true, onboarding_completed_at = NOW(), onboarding_step = 5,
    full_legal_name = 'Worker0 Workov0 Workerov0', phone = '+359 88 800 0000',
    date_of_birth = '2002-01-15', city = 'София', is_student = false, university = '',
    previous_experience = 'Опит в ресторантьорство - 2 години',
    preferred_category_id = (SELECT id FROM job_categories WHERE name = 'restaurant_server' LIMIT 1),
    availability_schedule = '{"2025-11-20": {"allDay": true}, "2025-11-21": {"allDay": true}, "2025-11-22": {"allDay": true}}',
    interview_scheduled = true, interview_completed = true, approved_for_work = true,
    approval_date = NOW(), referral_code = 'WORK0000', total_earnings = '0.00',
    no_show_count = 0, avatar_url = 'https://i.imgur.com/gbRuIN5.png', updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Worker 1: gogata3001@gmail.com
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, reauthentication_token, email_change,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
) VALUES (
    '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
    'gogata3001@gmail.com', crypt('Chelsea05.', gen_salt('bf')), NOW(),
    '', '', '', '', '', '', '',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Worker1 Workov1 Workerov1"}',
    false, 'authenticated', 'authenticated'
);

INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'email',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"gogata3001@gmail.com","email_verified":true}',
    NOW(), NOW(), NOW()
);

UPDATE profiles SET
    email = 'gogata3001@gmail.com', user_type = 'worker',
    onboarding_completed = true, onboarding_completed_at = NOW(), onboarding_step = 5,
    full_legal_name = 'Worker1 Workov1 Workerov1', phone = '+359 88 800 0001',
    date_of_birth = '2003-03-20', city = 'София', is_student = true,
    university = 'СУ "Св. Климент Охридски"', previous_experience = 'Студент, няма опит',
    preferred_category_id = (SELECT id FROM job_categories WHERE name = 'warehouse' LIMIT 1),
    availability_schedule = '{"2025-11-21": {"start": "09:00", "end": "17:00"}, "2025-11-22": {"start": "09:00", "end": "17:00"}}',
    interview_scheduled = true, interview_completed = true, approved_for_work = true,
    approval_date = NOW(), referral_code = 'WORK0001', total_earnings = '0.00',
    no_show_count = 0, avatar_url = 'https://i.imgur.com/gbRuIN5.png', updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000002';

-- Worker 2: gogata3002@gmail.com
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, reauthentication_token, email_change,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
) VALUES (
    '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
    'gogata3002@gmail.com', crypt('Chelsea05.', gen_salt('bf')), NOW(),
    '', '', '', '', '', '', '',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Worker2 Workov2 Workerov2"}',
    false, 'authenticated', 'authenticated'
);

INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'email',
    '{"sub":"00000000-0000-0000-0000-000000000003","email":"gogata3002@gmail.com","email_verified":true}',
    NOW(), NOW(), NOW()
);

UPDATE profiles SET
    email = 'gogata3002@gmail.com', user_type = 'worker',
    onboarding_completed = true, onboarding_completed_at = NOW(), onboarding_step = 5,
    full_legal_name = 'Worker2 Workov2 Workerov2', phone = '+359 88 800 0002',
    date_of_birth = '2004-06-10', city = 'София', is_student = true,
    university = 'УНСС', previous_experience = 'Работил съм в складове',
    preferred_category_id = (SELECT id FROM job_categories WHERE name = 'delivery' LIMIT 1),
    availability_schedule = '{"2025-11-23": {"allDay": true}, "2025-11-24": {"allDay": true}}',
    interview_scheduled = true, interview_completed = true, approved_for_work = true,
    approval_date = NOW(), referral_code = 'WORK0002', total_earnings = '0.00',
    no_show_count = 0, avatar_url = 'https://i.imgur.com/gbRuIN5.png', updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000003';

-- ============================================================================
-- PART 2.5: SEED ADMIN - Създаване на admin акаунт
-- ============================================================================

-- Admin: gogata1905@gmail.com
-- ВАЖНО: user_type = 'worker' + is_admin = true е правилният подход
-- CHECK constraint на profiles: user_type IN ('worker', 'business')
-- Admin флагът (is_admin) се проверява допълнително в middleware
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, reauthentication_token, email_change,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
) VALUES (
    '00000000-0000-0000-0000-000000000999', '00000000-0000-0000-0000-000000000000',
    'gogata1905@gmail.com', crypt('Chelsea05.', gen_salt('bf')), NOW(),
    '', '', '', '', '', '', '',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Admin Georgi"}',
    false, 'authenticated', 'authenticated'
);

INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000999', '00000000-0000-0000-0000-000000000999', 'email',
    '{"sub":"00000000-0000-0000-0000-000000000999","email":"gogata1905@gmail.com","email_verified":true}',
    NOW(), NOW(), NOW()
);

UPDATE profiles SET
    email = 'gogata1905@gmail.com',
    user_type = 'worker',
    is_admin = true,
    onboarding_completed = true,
    onboarding_completed_at = NOW(),
    onboarding_step = 0,
    full_legal_name = 'Георги Марков',
    phone = '+359 88 888 8888',
    city = 'София',
    avatar_url = 'https://i.imgur.com/gbRuIN5.png',
    referral_code = 'ADMIN999',
    approved_for_work = true,
    updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000999';

-- ============================================================================
-- PART 3: SEED BUSINESSES - Създаване на 3 business акаунта
-- ============================================================================

-- Business 1: gogata1905@abv.bg
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, reauthentication_token, email_change,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
) VALUES (
    '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000000',
    'gogata1905@abv.bg', crypt('Chelsea05.', gen_salt('bf')), NOW(),
    '', '', '', '', '', '', '',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Георги Иванов"}',
    false, 'authenticated', 'authenticated'
);

INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000101', 'email',
    '{"sub":"00000000-0000-0000-0000-000000000101","email":"gogata1905@abv.bg","email_verified":true}',
    NOW(), NOW(), NOW()
);

UPDATE profiles SET
    email = 'gogata1905@abv.bg', user_type = 'business',
    onboarding_completed = true, onboarding_completed_at = NOW(), onboarding_step = 4,
    full_legal_name = 'Георги Петров Иванов', phone = '+359 88 111 1111',
    city = 'София', avatar_url = 'https://i.imgur.com/gbRuIN5.png', updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000101';

INSERT INTO businesses (
    id, company_name, business_id_number, vat_registered, vat_number,
    full_legal_name, contact_email, contact_phone,
    address_line_1, city, postal_code, industry, location_name,
    subscription_tier, job_posting_credits, credits_reset_date,
    verified, active, onboarding_completed, onboarding_step,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000201',
    'Тестова Фирма 1 ООД', '123456789', true, 'BG123456789',
    'Георги Петров Иванов', 'gogata1905@abv.bg', '+359 88 111 1111',
    'бул. Витоша 100', 'София', '1000', 'restaurant', 'Ресторант Тест 1',
    'basic', 3, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
    true, true, true, 4, NOW(), NOW()
);

INSERT INTO business_users (id, business_id, user_id, role, active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'owner', true, NOW()
);

-- Business 2: gogata1905@yahoo.com
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, reauthentication_token, email_change,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
) VALUES (
    '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000000',
    'gogata1905@yahoo.com', crypt('Chelsea05.', gen_salt('bf')), NOW(),
    '', '', '', '', '', '', '',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Мария Димитрова"}',
    false, 'authenticated', 'authenticated'
);

INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000102', 'email',
    '{"sub":"00000000-0000-0000-0000-000000000102","email":"gogata1905@yahoo.com","email_verified":true}',
    NOW(), NOW(), NOW()
);

UPDATE profiles SET
    email = 'gogata1905@yahoo.com', user_type = 'business',
    onboarding_completed = true, onboarding_completed_at = NOW(), onboarding_step = 4,
    full_legal_name = 'Мария Стоянова Димитрова', phone = '+359 88 222 2222',
    city = 'София', avatar_url = 'https://i.imgur.com/gbRuIN5.png', updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000102';

INSERT INTO businesses (
    id, company_name, business_id_number, vat_registered, vat_number,
    full_legal_name, contact_email, contact_phone,
    address_line_1, city, postal_code, industry, location_name,
    subscription_tier, job_posting_credits, credits_reset_date,
    verified, active, onboarding_completed, onboarding_step,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000202',
    'Тестова Фирма 2 ЕООД', '987654321', false, NULL,
    'Мария Стоянова Димитрова', 'gogata1905@yahoo.com', '+359 88 222 2222',
    'ул. Георг Бенковски 25', 'София', '1606', 'warehouse', 'Склад Младост',
    'basic', 3, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
    true, true, true, 4, NOW(), NOW()
);

INSERT INTO business_users (id, business_id, user_id, role, active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    'owner', true, NOW()
);

-- Business 3: gogata3003@gmail.com
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, reauthentication_token, email_change,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
) VALUES (
    '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
    'gogata3003@gmail.com', crypt('Chelsea05.', gen_salt('bf')), NOW(),
    '', '', '', '', '', '', '',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Стоян Тодоров"}',
    false, 'authenticated', 'authenticated'
);

INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'email',
    '{"sub":"00000000-0000-0000-0000-000000000004","email":"gogata3003@gmail.com","email_verified":true}',
    NOW(), NOW(), NOW()
);

UPDATE profiles SET
    email = 'gogata3003@gmail.com', user_type = 'business',
    onboarding_completed = true, onboarding_completed_at = NOW(), onboarding_step = 4,
    full_legal_name = 'Стоян Николов Тодоров', phone = '+359 88 444 4444',
    city = 'София', avatar_url = 'https://i.imgur.com/gbRuIN5.png', updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000004';

INSERT INTO businesses (
    id, company_name, business_id_number, vat_registered, vat_number,
    full_legal_name, contact_email, contact_phone,
    address_line_1, city, postal_code, industry, location_name,
    subscription_tier, job_posting_credits, credits_reset_date,
    verified, active, onboarding_completed, onboarding_step,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000204',
    'Тестова Фирма 4 АД', '444555666', true, 'BG444555666',
    'Стоян Николов Тодоров', 'gogata3003@gmail.com', '+359 88 444 4444',
    'ул. Шипка 34', 'София', '1504', 'retail', 'Магазин Тест 4',
    'basic', 3, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month',
    true, true, true, 4, NOW(), NOW()
);

INSERT INTO business_users (id, business_id, user_id, role, active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000304',
    '00000000-0000-0000-0000-000000000204',
    '00000000-0000-0000-0000-000000000004',
    'owner', true, NOW()
);

-- Business 4: gogata3004@gmail.com
INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    phone_change_token, reauthentication_token, email_change,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
) VALUES (
    '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
    'gogata3004@gmail.com', crypt('Chelsea05.', gen_salt('bf')), NOW(),
    '', '', '', '', '', '', '',
    NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Петър Георгиев"}',
    false, 'authenticated', 'authenticated'
);

INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'email',
    '{"sub":"00000000-0000-0000-0000-000000000005","email":"gogata3004@gmail.com","email_verified":true}',
    NOW(), NOW(), NOW()
);

UPDATE profiles SET
    email = 'gogata3004@gmail.com', user_type = 'business',
    onboarding_completed = true, onboarding_completed_at = NOW(), onboarding_step = 4,
    full_legal_name = 'Петър Иванов Георгиев', phone = '+359 88 333 3333',
    city = 'София', avatar_url = 'https://i.imgur.com/gbRuIN5.png', updated_at = NOW()
WHERE id = '00000000-0000-0000-0000-000000000005';

INSERT INTO businesses (
    id, company_name, business_id_number, vat_registered, vat_number,
    full_legal_name, contact_email, contact_phone,
    address_line_1, city, postal_code, industry, location_name,
    subscription_tier, job_posting_credits, credits_reset_date,
    verified, active, onboarding_completed, onboarding_step,
    trial_active, verification_payment_status, selected_plan_for_trial,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000203',
    'Тестова Фирма 3 ЕООД', '555666777', true, 'BG555666777',
    'Петър Иванов Георгиев', 'gogata3004@gmail.com', '+359 88 333 3333',
    'ул. Цар Борис III 15', 'София', '1618', 'hospitality', 'Хотел Тест 3',
    'enterprise', 9999999, DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '2 months',
    true, true, true, 4,
    false, 'completed', 'enterprise',
    NOW(), NOW()
);

INSERT INTO business_users (id, business_id, user_id, role, active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000303',
    '00000000-0000-0000-0000-000000000203',
    '00000000-0000-0000-0000-000000000005',
    'owner', true, NOW()
);

-- ============================================================================
-- PART 3.5: SEED ENTERPRISE SUBSCRIPTION за gogata3004@gmail.com
-- ============================================================================
-- Това симулира закупен Enterprise план точно както gogata3006@gmail.com

-- Recurring plan (активен Enterprise абонамент)
INSERT INTO recurring_plans (
    id, user_id, plan_type, amount, currency,
    merch_rn_id,
    recur_freq, recur_freq_unit, recur_exp, recur_mday_payment,
    status, next_billing_date, activated_at,
    failed_payment_count, cancels_at_period_end, borica_closed,
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000501',
    '00000000-0000-0000-0000-000000000005',
    'business_enterprise',
    500.00,
    'EUR',
    'SEED0000000000001',
    1,
    'M',
    (CURRENT_DATE + INTERVAL '1 year')::date,
    EXTRACT(DAY FROM CURRENT_DATE)::integer,
    'active',
    (CURRENT_DATE + INTERVAL '1 month')::date,
    NOW(),
    0,
    false,
    false,
    NOW(),
    NOW()
);

-- Payment transaction (успешно първоначално плащане за Enterprise)
INSERT INTO payment_transactions (
    id, user_id, business_id, payment_type, transaction_type,
    amount, currency, recurring_plan_id,
    borica_order_id, borica_rrn, borica_int_ref, borica_approval, borica_rc,
    borica_response, status,
    retry_count, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000203',
    'recurring',
    'subscription',
    500.00,
    'EUR',
    '00000000-0000-0000-0000-000000000501',
    'SEED001',
    'SEED533801491156',
    'SEED9DC2778950E68B8A',
    'SEEDS03220',
    '00',
    '{"RC": "00", "STATUSMSG": "Approved. Seeded for testing.", "CARD": "4341XXXXXXXX0044", "CARD_BRAND": "VISA"}'::jsonb,
    'success',
    0,
    NOW(),
    NOW()
);

-- Verification transaction (1 € верификация)
INSERT INTO payment_transactions (
    id, user_id, business_id, payment_type, transaction_type,
    amount, currency, recurring_plan_id,
    borica_order_id, borica_rrn, borica_int_ref, borica_approval, borica_rc,
    borica_response, status, metadata,
    retry_count, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000602',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000203',
    'recurring',
    'verification',
    1.00,
    'EUR',
    '00000000-0000-0000-0000-000000000501',
    'SEED002',
    'SEED533801491155',
    'SEEDEFB9F7136987A1B9',
    'SEEDS37456',
    '00',
    '{"RC": "00", "STATUSMSG": "Approved. Seeded verification.", "CARD": "4341XXXXXXXX0044", "CARD_BRAND": "VISA"}'::jsonb,
    'success',
    '{"TRTYPE": "1", "selected_plan": "enterprise", "verification_purpose": "business_onboarding"}'::jsonb,
    0,
    NOW(),
    NOW()
);

-- ============================================================================
-- PART 4: SEED JOBS - Създаване на 8 тестови обяви
-- ============================================================================

-- Job 1: Сервитьор за уикенда (16 часа = 2 дни x 8 часа)
INSERT INTO jobs (
    id, business_id, posted_by, title, description, category_id,
    location_name, location_address,
    start_time, end_time,
    hourly_rate, commission_percentage, commission_amount, total_cost,
    requirements, benefits,
    max_applicants, status, featured, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'Сервитьор за уикенда',
    'Търсим енергичен сервитьор за работа през уикенда в натоварен ресторант в центъра. Изисква се опит минимум 6 месеца.',
    (SELECT id FROM job_categories WHERE name = 'restaurant_server'),
    'Ресторант Тест 1', 'бул. Витоша 100, кв. Център, София',
    (CURRENT_DATE + INTERVAL '3 days')::timestamp + TIME '10:00:00',
    (CURRENT_DATE + INTERVAL '3 days')::timestamp + TIME '10:00:00' + INTERVAL '16 hours',
    18.00, 0.10, 28.80, 316.80,
    'Минимум 6 месеца опит като сервитьор
Отлични комуникативни умения
Бързина и прецизност при работа',
    'Обедна почивка
Бакшиши (около 50-80 € на ден допълнително)
Приятна работна атмосфера',
    2, 'published', false, NOW(), NOW()
);

-- Job 2: Бармен за вечерна смяна (8 часа)
INSERT INTO jobs (
    id, business_id, posted_by, title, description, category_id,
    location_name, location_address,
    start_time, end_time,
    hourly_rate, commission_percentage, commission_amount, total_cost,
    requirements, benefits,
    max_applicants, status, featured, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'Бармен за вечерна смяна',
    'Нужен е опитен бармен за вечерни смени. Изисква се познаване на класически коктейли.',
    (SELECT id FROM job_categories WHERE name = 'restaurant_bar'),
    'Ресторант Тест 1', 'бул. Витоша 100, кв. Център, София',
    (CURRENT_DATE + INTERVAL '5 days')::timestamp + TIME '18:00:00',
    (CURRENT_DATE + INTERVAL '5 days')::timestamp + TIME '18:00:00' + INTERVAL '8 hours',
    20.00, 0.10, 16.00, 176.00,
    'Опит като бармен минимум 1 година
Познаване на класически коктейли
Бърза работа при натоварване',
    'Високи бакшиши (100-150 € на смяна)
Безплатни напитки по време на работа
Възможност за кариерно развитие',
    1, 'published', false, NOW(), NOW()
);

-- Job 3: Помощник-готвач (8 часа)
INSERT INTO jobs (
    id, business_id, posted_by, title, description, category_id,
    location_name, location_address,
    start_time, end_time,
    hourly_rate, commission_percentage, commission_amount, total_cost,
    requirements, benefits,
    max_applicants, status, featured, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000403',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'Помощник-готвач',
    'Търсим кухненски помощник за подготовка на продукти и поддържане на чистота в кухнята. Не се изисква опит.',
    (SELECT id FROM job_categories WHERE name = 'restaurant_kitchen'),
    'Ресторант Тест 1', 'бул. Витоша 100, кв. Център, София',
    (CURRENT_DATE + INTERVAL '2 days')::timestamp + TIME '08:00:00',
    (CURRENT_DATE + INTERVAL '2 days')::timestamp + TIME '08:00:00' + INTERVAL '8 hours',
    15.00, 0.10, 12.00, 132.00,
    'Не се изисква опит
Желание за учене
Физическа издръжливост',
    'Обучение на място
Безплатно хранене
Приятелски екип',
    3, 'published', false, NOW(), NOW()
);

-- Job 4: Хостес за вечери (8 часа)
INSERT INTO jobs (
    id, business_id, posted_by, title, description, category_id,
    location_name, location_address,
    start_time, end_time,
    hourly_rate, commission_percentage, commission_amount, total_cost,
    requirements, benefits,
    max_applicants, status, featured, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000404',
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000101',
    'Хостес за вечери',
    'Търсим усмихнат хостес за посрещане на гости и резервации. Необходими са отлични комуникативни умения.',
    (SELECT id FROM job_categories WHERE name = 'restaurant_host'),
    'Ресторант Тест 1', 'бул. Витоша 100, кв. Център, София',
    (CURRENT_DATE + INTERVAL '7 days')::timestamp + TIME '17:00:00',
    (CURRENT_DATE + INTERVAL '7 days')::timestamp + TIME '17:00:00' + INTERVAL '8 hours',
    16.00, 0.10, 12.80, 140.80,
    'Приятна външност
Отлични комуникативни умения
Владеене на английски език (предимство)',
    'Елегантна работна среда
Контакт с интересни хора
Бакшиши',
    1, 'published', false, NOW(), NOW()
);

-- Job 5: Складов работник - денна смяна (24 часа = 3 смени x 8 часа)
INSERT INTO jobs (
    id, business_id, posted_by, title, description, category_id,
    location_name, location_address,
    start_time, end_time,
    hourly_rate, commission_percentage, commission_amount, total_cost,
    requirements, benefits,
    max_applicants, status, featured, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000405',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    'Складов работник - денна смяна',
    'Търсим складов работник за товарене/разтоварване и организация на стоки. Работа с палетна количка.',
    (SELECT id FROM job_categories WHERE name = 'warehouse'),
    'Склад Младост', 'ул. Георг Бенковски 25, кв. Младост, София',
    (CURRENT_DATE + INTERVAL '1 day')::timestamp + TIME '07:00:00',
    (CURRENT_DATE + INTERVAL '1 day')::timestamp + TIME '07:00:00' + INTERVAL '24 hours',
    17.00, 0.10, 40.80, 448.80,
    'Физическа издръжливост
Опит с палетна количка (предимство)
Отговорност',
    'Стабилна работа
Възможност за дългосрочна заетост
Обедна почивка',
    5, 'published', false, NOW(), NOW()
);

-- Job 6: Работник за пакетиране (16 часа = 2 смени x 8 часа)
INSERT INTO jobs (
    id, business_id, posted_by, title, description, category_id,
    location_name, location_address,
    start_time, end_time,
    hourly_rate, commission_percentage, commission_amount, total_cost,
    requirements, benefits,
    max_applicants, status, featured, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000406',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    'Работник за пакетиране',
    'Лека работа - пакетиране на малки стоки. Подходяща за студенти. Не се изисква опит.',
    (SELECT id FROM job_categories WHERE name = 'warehouse'),
    'Склад Младост', 'ул. Георг Бенковски 25, кв. Младост, София',
    (CURRENT_DATE + INTERVAL '4 days')::timestamp + TIME '09:00:00',
    (CURRENT_DATE + INTERVAL '4 days')::timestamp + TIME '09:00:00' + INTERVAL '16 hours',
    14.00, 0.10, 22.40, 246.40,
    'Не се изисква опит
Внимателност и прецизност
Работа в екип',
    'Лека физическа работа
Идеална за студенти
Гъвкав график',
    10, 'published', false, NOW(), NOW()
);

-- Job 7: Куриер/Доставчик (24 часа = 3 смени x 8 часа)
INSERT INTO jobs (
    id, business_id, posted_by, title, description, category_id,
    location_name, location_address,
    start_time, end_time,
    hourly_rate, commission_percentage, commission_amount, total_cost,
    requirements, benefits,
    max_applicants, status, featured, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000407',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    'Куриер/Доставчик',
    'Търсим куриер с личен транспорт (велосипед или мотор) за доставки в София. Гъвкаво работно време.',
    (SELECT id FROM job_categories WHERE name = 'delivery'),
    'Склад Младост', 'Стартова точка: ул. Георг Бенковски 25, кв. Младост, София',
    (CURRENT_DATE + INTERVAL '2 days')::timestamp + TIME '11:00:00',
    (CURRENT_DATE + INTERVAL '2 days')::timestamp + TIME '11:00:00' + INTERVAL '24 hours',
    19.00, 0.10, 45.60, 501.60,
    'Личен транспорт (велосипед/мотор)
Свободно шофиране
Познаване на София',
    'Гъвкав график
Платено гориво
Бонуси за скорост',
    3, 'published', false, NOW(), NOW()
);

-- Job 8: Помощник за инвентаризация (24 часа = 3 дни x 8 часа)
INSERT INTO jobs (
    id, business_id, posted_by, title, description, category_id,
    location_name, location_address,
    start_time, end_time,
    hourly_rate, commission_percentage, commission_amount, total_cost,
    requirements, benefits,
    max_applicants, status, featured, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000408',
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000102',
    'Помощник за инвентаризация',
    'Нужни са хора за годишна инвентаризация на склада. Работа с Excel и сканери. 3 дни интензивна работа.',
    (SELECT id FROM job_categories WHERE name = 'warehouse'),
    'Склад Младост', 'ул. Георг Бенковски 25, кв. Младост, София',
    (CURRENT_DATE + INTERVAL '10 days')::timestamp + TIME '08:00:00',
    (CURRENT_DATE + INTERVAL '10 days')::timestamp + TIME '08:00:00' + INTERVAL '24 hours',
    22.00, 0.10, 52.80, 580.80,
    'Компютърна грамотност (Excel)
Внимателност и прецизност
Опит със сканери (предимство)',
    'Висока почасова ставка
Краткосрочна заетост (3 дни)
Обучение на място',
    4, 'published', false, NOW(), NOW()
);

-- ============================================================================
-- PART 5: Generate QR codes for all test jobs
-- ============================================================================

-- Generate unique QR codes and secrets for all jobs that don't have them
UPDATE jobs
SET
    qr_code = 'hustl-job-' || gen_random_uuid()::text,
    qr_code_secret = gen_random_uuid()::text
WHERE qr_code IS NULL OR qr_code_secret IS NULL;

DO $$
DECLARE
    qr_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO qr_count FROM jobs WHERE qr_code IS NOT NULL;
    RAISE NOTICE '✅ QR codes generated for % jobs', qr_count;
END $$;

-- ============================================================================
-- DONE! Тестовите акаунти са създадени
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DROP & SEED ЗАВЪРШИ УСПЕШНО!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Създадени са:';
    RAISE NOTICE '- 3 Worker акаунта (gogata3000-3002@gmail.com)';
    RAISE NOTICE '- 1 Admin акаунт (gogata1905@gmail.com)';
    RAISE NOTICE '- 4 Business акаунта (gogata1905@abv.bg, gogata1905@yahoo.com, gogata3003@gmail.com, gogata3004@gmail.com)';
    RAISE NOTICE '- 8 Job обяви (4 от Business 1 & 2)';
    RAISE NOTICE '- 1 Enterprise subscription (gogata3004@gmail.com)';
    RAISE NOTICE '';
    RAISE NOTICE 'Всички акаунти използват парола: Chelsea05.';
    RAISE NOTICE '';
    RAISE NOTICE 'Admin: gogata1905@gmail.com (user_type=worker, is_admin=true)';
    RAISE NOTICE 'Workers са готови за работа (approved_for_work = true)';
    RAISE NOTICE 'Businesses са верифицирани (verified = true)';
    RAISE NOTICE '';
    RAISE NOTICE 'ЗАБЕЛЕЖКА: gogata3003@gmail.com и gogata3004@gmail.com СА BUSINESS акаунти';
    RAISE NOTICE '';
    RAISE NOTICE '🏆 ENTERPRISE SUBSCRIPTION (gogata3004@gmail.com):';
    RAISE NOTICE '   - subscription_tier: enterprise';
    RAISE NOTICE '   - job_posting_credits: 9999999';
    RAISE NOTICE '   - recurring_plan: active (500 EUR/месец)';
    RAISE NOTICE '   - next_billing_date: +1 месец от днес';
    RAISE NOTICE '   - payment_transactions: 2 успешни (500 EUR + 1 EUR верификация)';
    RAISE NOTICE '========================================';
END $$;