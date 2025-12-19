# scripts/delete-test-users.ps1
# PowerShell скрипт за ИЗТРИВАНЕ на тестови потребители от Supabase database
#
# Изтрива ВСИЧКИ данни за следните потребители:
#   • gogata3000@gmail.com
#   • gogata3001@gmail.com
#   • gogata3002@gmail.com
#   • gogata3003@gmail.com
#   • gogata3004@gmail.com
#   • gogata3005@gmail.com
#   • gogata3006@gmail.com
#   • gogata1905@abv.bg
#   • gogata1905@yahoo.com
#   • gogata1901@gmail.com
#   • georgimarkov1905@gmail.com

# Stop on any error
$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Red
Write-Host "   DELETE TEST USERS - hustl.bg" -ForegroundColor Red
Write-Host "================================" -ForegroundColor Red
Write-Host ""

# ============================================================================
# Configuration
# ============================================================================

$DbHost = "aws-0-eu-central-1.pooler.supabase.com"
$DbPort = "6543"
$DbUser = "postgres.pljlkzzzizljtgbzopnz"
$DbName = "postgres"
$DbPassword = "Hustl-Project-Admin"

# ============================================================================
# SQL Script (embedded)
# ============================================================================

$SqlScript = @"
DO `$`$
DECLARE
    emails_to_delete TEXT[] := ARRAY[
        'gogata3000@gmail.com',
        'gogata3001@gmail.com',
        'gogata3002@gmail.com',
        'gogata3003@gmail.com',
        'gogata3004@gmail.com',
        'gogata3005@gmail.com',
        'gogata3006@gmail.com',
        'gogata1905@abv.bg',
        'gogata1905@yahoo.com',
        'gogata1901@gmail.com',
        'georgimarkov1905@gmail.com'
    ];
    user_ids_to_delete UUID[];
    business_ids_to_delete UUID[];
    job_ids_to_delete UUID[];
    application_ids_to_delete UUID[];
    shift_ids_to_delete UUID[];
    deleted_count INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'DELETING TEST USERS DATA FROM ALL TABLES';
    RAISE NOTICE '============================================================';

    -- Collect User IDs
    SELECT ARRAY_AGG(id) INTO user_ids_to_delete
    FROM auth.users WHERE email = ANY(emails_to_delete);

    IF user_ids_to_delete IS NULL OR array_length(user_ids_to_delete, 1) IS NULL THEN
        RAISE NOTICE 'No users found with the specified emails. Nothing to delete.';
        RETURN;
    END IF;

    RAISE NOTICE 'Found % users to delete', array_length(user_ids_to_delete, 1);

    -- Collect Business IDs (owned by users being deleted)
    SELECT ARRAY_AGG(DISTINCT b.id) INTO business_ids_to_delete
    FROM businesses b
    JOIN business_users bu ON bu.business_id = b.id
    WHERE bu.user_id = ANY(user_ids_to_delete) AND bu.role = 'owner';

    IF business_ids_to_delete IS NULL THEN
        business_ids_to_delete := ARRAY[]::UUID[];
    ELSE
        RAISE NOTICE 'Found % businesses to delete (owned by users)', array_length(business_ids_to_delete, 1);
    END IF;

    -- Also collect orphaned businesses that have payment_transactions from users being deleted
    -- (businesses without owners in business_users but with verification_transaction_id from our users)
    SELECT ARRAY_AGG(DISTINCT b.id) INTO business_ids_to_delete
    FROM (
        SELECT unnest(business_ids_to_delete) AS id
        UNION
        SELECT b.id
        FROM businesses b
        JOIN payment_transactions pt ON b.verification_transaction_id = pt.id
        WHERE pt.user_id = ANY(user_ids_to_delete)
        AND NOT EXISTS (SELECT 1 FROM business_users bu WHERE bu.business_id = b.id)
    ) AS combined_businesses(id)
    JOIN businesses b ON b.id = combined_businesses.id;

    IF business_ids_to_delete IS NOT NULL AND array_length(business_ids_to_delete, 1) > 0 THEN
        RAISE NOTICE 'Total businesses to delete (including orphans): %', array_length(business_ids_to_delete, 1);
    END IF;

    -- Collect Job IDs
    SELECT ARRAY_AGG(DISTINCT id) INTO job_ids_to_delete
    FROM jobs
    WHERE business_id = ANY(business_ids_to_delete)
       OR posted_by = ANY(user_ids_to_delete)
       OR selected_worker_id = ANY(user_ids_to_delete);

    IF job_ids_to_delete IS NULL THEN
        job_ids_to_delete := ARRAY[]::UUID[];
    ELSE
        RAISE NOTICE 'Found % jobs to delete', array_length(job_ids_to_delete, 1);
    END IF;

    -- Collect Application IDs
    SELECT ARRAY_AGG(DISTINCT id) INTO application_ids_to_delete
    FROM job_applications
    WHERE student_id = ANY(user_ids_to_delete) OR job_id = ANY(job_ids_to_delete);

    IF application_ids_to_delete IS NULL THEN
        application_ids_to_delete := ARRAY[]::UUID[];
    END IF;

    -- Collect Shift IDs
    SELECT ARRAY_AGG(DISTINCT id) INTO shift_ids_to_delete
    FROM shifts
    WHERE student_id = ANY(user_ids_to_delete)
       OR job_id = ANY(job_ids_to_delete)
       OR application_id = ANY(application_ids_to_delete);

    IF shift_ids_to_delete IS NULL THEN
        shift_ids_to_delete := ARRAY[]::UUID[];
    END IF;

    RAISE NOTICE 'Starting deletion...';

    -- 1. payment_webhooks
    DELETE FROM payment_webhooks WHERE transaction_id IN (
        SELECT id FROM payment_transactions WHERE user_id = ANY(user_ids_to_delete)
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from payment_webhooks', deleted_count; END IF;

    -- 2. Clear businesses.verification_transaction_id foreign key BEFORE deleting payment_transactions
    -- First: Clear for businesses we're deleting
    UPDATE businesses SET verification_transaction_id = NULL WHERE id = ANY(business_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Cleared verification_transaction_id for % businesses (by business_id)', deleted_count; END IF;

    -- 2b. CRITICAL: Also clear verification_transaction_id for ANY business that references
    -- a payment_transaction belonging to users being deleted (handles orphaned businesses)
    UPDATE businesses b SET verification_transaction_id = NULL
    WHERE b.verification_transaction_id IN (
        SELECT pt.id FROM payment_transactions pt
        WHERE pt.user_id = ANY(user_ids_to_delete) OR pt.business_id = ANY(business_ids_to_delete)
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Cleared verification_transaction_id for % businesses (by transaction user/business)', deleted_count; END IF;

    -- 3. payment_transactions
    DELETE FROM payment_transactions WHERE user_id = ANY(user_ids_to_delete) OR business_id = ANY(business_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from payment_transactions', deleted_count; END IF;

    -- 3. job_cancellation_fines
    DELETE FROM job_cancellation_fines WHERE job_id = ANY(job_ids_to_delete) OR business_id = ANY(business_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from job_cancellation_fines', deleted_count; END IF;

    -- 4. recurring_plans
    DELETE FROM recurring_plans WHERE user_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from recurring_plans', deleted_count; END IF;

    -- 5. scheduled_notifications
    DELETE FROM scheduled_notifications WHERE user_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from scheduled_notifications', deleted_count; END IF;

    -- 6. user_tokens
    DELETE FROM user_tokens WHERE user_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from user_tokens', deleted_count; END IF;

    -- 7. user_notification_preferences
    DELETE FROM user_notification_preferences WHERE user_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from user_notification_preferences', deleted_count; END IF;

    -- 8. business_followers
    DELETE FROM business_followers WHERE worker_id = ANY(user_ids_to_delete) OR business_id = ANY(business_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from business_followers', deleted_count; END IF;

    -- 9. reviews
    DELETE FROM reviews WHERE reviewer_id = ANY(user_ids_to_delete) OR reviewed_id = ANY(user_ids_to_delete) OR job_id = ANY(job_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from reviews', deleted_count; END IF;

    -- 10. notifications
    DELETE FROM notifications WHERE user_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from notifications', deleted_count; END IF;

    -- 11. disputes
    DELETE FROM disputes
    WHERE reporter_id = ANY(user_ids_to_delete)
       OR reported_id = ANY(user_ids_to_delete)
       OR resolved_by = ANY(user_ids_to_delete)
       OR job_id = ANY(job_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from disputes', deleted_count; END IF;

    -- 12. saved_jobs
    DELETE FROM saved_jobs WHERE user_id = ANY(user_ids_to_delete) OR job_id = ANY(job_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from saved_jobs', deleted_count; END IF;

    -- 13. saved_searches
    DELETE FROM saved_searches WHERE user_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from saved_searches', deleted_count; END IF;

    -- 14. payments
    DELETE FROM payments
    WHERE worker_id = ANY(user_ids_to_delete)
       OR business_id = ANY(business_ids_to_delete)
       OR job_id = ANY(job_ids_to_delete)
       OR refunded_by = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from payments', deleted_count; END IF;

    -- 15. messages
    DELETE FROM messages WHERE sender_id = ANY(user_ids_to_delete) OR recipient_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from messages', deleted_count; END IF;

    -- 16. shift_logs
    DELETE FROM shift_logs
    WHERE student_id = ANY(user_ids_to_delete)
       OR shift_id = ANY(shift_ids_to_delete)
       OR verified_by = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from shift_logs', deleted_count; END IF;

    -- 17. shift_qr_codes
    DELETE FROM shift_qr_codes
    WHERE shift_id = ANY(shift_ids_to_delete)
       OR business_id = ANY(business_ids_to_delete)
       OR generated_by = ANY(user_ids_to_delete)
       OR used_by = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from shift_qr_codes', deleted_count; END IF;

    -- 18. shifts
    DELETE FROM shifts WHERE student_id = ANY(user_ids_to_delete) OR job_id = ANY(job_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from shifts', deleted_count; END IF;

    -- 19. job_applications
    DELETE FROM job_applications WHERE student_id = ANY(user_ids_to_delete) OR job_id = ANY(job_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from job_applications', deleted_count; END IF;

    -- 20. jobs
    UPDATE jobs SET selected_worker_id = NULL WHERE selected_worker_id = ANY(user_ids_to_delete);
    UPDATE jobs SET canceled_by = NULL WHERE canceled_by = ANY(user_ids_to_delete);
    UPDATE jobs SET cancellation_fine_id = NULL WHERE id = ANY(job_ids_to_delete);
    DELETE FROM jobs WHERE business_id = ANY(business_ids_to_delete) OR posted_by = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from jobs', deleted_count; END IF;

    -- 21. business_consultations
    DELETE FROM business_consultations WHERE business_id = ANY(business_ids_to_delete) OR consultation_by = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from business_consultations', deleted_count; END IF;

    -- 22. business_invitations
    DELETE FROM business_invitations WHERE business_id = ANY(business_ids_to_delete) OR invited_by = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from business_invitations', deleted_count; END IF;

    -- 23. business_locations
    DELETE FROM business_locations WHERE business_id = ANY(business_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from business_locations', deleted_count; END IF;

    -- 24. business_users
    DELETE FROM business_users WHERE business_id = ANY(business_ids_to_delete) OR user_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from business_users', deleted_count; END IF;

    -- 25. businesses
    UPDATE businesses SET onboarded_by = NULL WHERE onboarded_by = ANY(user_ids_to_delete);
    DELETE FROM businesses WHERE id = ANY(business_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from businesses', deleted_count; END IF;

    -- 26. contract_templates
    DELETE FROM contract_templates WHERE uploaded_by = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from contract_templates', deleted_count; END IF;

    -- 27. blog_posts
    DELETE FROM blog_posts WHERE author_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from blog_posts', deleted_count; END IF;

    -- 28. file_uploads
    DELETE FROM file_uploads WHERE user_id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from file_uploads', deleted_count; END IF;

    -- 29. availability_schedule_backup
    DELETE FROM availability_schedule_backup WHERE email = ANY(emails_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from availability_schedule_backup', deleted_count; END IF;

    -- 30. Clear profile references
    UPDATE profiles SET approved_by = NULL WHERE approved_by = ANY(user_ids_to_delete);
    UPDATE profiles SET referred_by = NULL WHERE referred_by = ANY(user_ids_to_delete);
    UPDATE profiles SET profile_photo_id = NULL WHERE id = ANY(user_ids_to_delete);
    UPDATE profiles SET id_document_id = NULL WHERE id = ANY(user_ids_to_delete);

    -- 31. profiles
    DELETE FROM profiles WHERE id = ANY(user_ids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from profiles', deleted_count; END IF;

    -- 32. auth.users
    DELETE FROM auth.users WHERE email = ANY(emails_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    IF deleted_count > 0 THEN RAISE NOTICE 'Deleted % from auth.users', deleted_count; END IF;

    RAISE NOTICE '============================================================';
    RAISE NOTICE 'DELETION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '============================================================';

END `$`$;
"@

# ============================================================================
# Helper Functions
# ============================================================================

function Pause-And-Exit {
    param([int]$ExitCode = 0)
    Write-Host ""
    Write-Host "Натисни Enter за изход..." -ForegroundColor Yellow
    $null = Read-Host
    exit $ExitCode
}

function Find-Psql {
    Write-Host "Търсене на psql..." -ForegroundColor Yellow

    $psqlInPath = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlInPath) {
        Write-Host "Намерен psql в PATH: $($psqlInPath.Source)" -ForegroundColor Green
        return $psqlInPath.Source
    }

    $commonPaths = @(
        "C:\Program Files\PostgreSQL\*\bin\psql.exe",
        "C:\Program Files (x86)\PostgreSQL\*\bin\psql.exe",
        "C:\PostgreSQL\*\bin\psql.exe"
    )

    foreach ($pathPattern in $commonPaths) {
        $found = Get-ChildItem -Path $pathPattern -ErrorAction SilentlyContinue |
                 Sort-Object -Property FullName -Descending |
                 Select-Object -First 1

        if ($found) {
            Write-Host "Намерен psql: $($found.FullName)" -ForegroundColor Green
            return $found.FullName
        }
    }

    $pgAdmin4Path = Join-Path $env:LOCALAPPDATA "Programs\pgAdmin 4\runtime\psql.exe"
    if (Test-Path $pgAdmin4Path) {
        Write-Host "Намерен psql в pgAdmin 4: $pgAdmin4Path" -ForegroundColor Green
        return $pgAdmin4Path
    }

    Write-Host "psql не е намерен!" -ForegroundColor Red
    Write-Host "Инсталирай PostgreSQL от: https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    return $null
}

# ============================================================================
# Main Script
# ============================================================================

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8

    $psqlPath = Find-Psql
    if (-not $psqlPath) {
        Pause-And-Exit 1
    }

    Write-Host ""

    # Setup pgpass.conf
    $pgpassPath = Join-Path $env:APPDATA "postgresql\pgpass.conf"
    $pgpassDir = Split-Path $pgpassPath -Parent

    if (-not (Test-Path $pgpassDir)) {
        New-Item -ItemType Directory -Path $pgpassDir -Force | Out-Null
    }

    $pgpassEntry = "${DbHost}:${DbPort}:${DbName}:${DbUser}:${DbPassword}"

    if (Test-Path $pgpassPath) {
        $existingContent = Get-Content $pgpassPath -ErrorAction SilentlyContinue
        $filteredContent = $existingContent | Where-Object { $_ -notmatch "^$DbHost.*$DbUser" }
        Set-Content -Path $pgpassPath -Value $filteredContent -Encoding UTF8 -Force
    }

    Add-Content -Path $pgpassPath -Value $pgpassEntry -Encoding UTF8

    Write-Host "Изпълнявам DELETE script..." -ForegroundColor Yellow
    Write-Host ""

    $env:PGHOST = $DbHost
    $env:PGPORT = $DbPort
    $env:PGUSER = $DbUser
    $env:PGDATABASE = $DbName
    $env:PGSSLMODE = "require"

    # Execute SQL directly via pipe
    $SqlScript | & $psqlPath -v ON_ERROR_STOP=1

    if ($LASTEXITCODE -ne 0) {
        throw "psql завърши с грешка (exit code: $LASTEXITCODE)"
    }

    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "   УСПЕШНО ИЗТРИТИ!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Изтрити потребители:" -ForegroundColor Cyan
    Write-Host "  gogata3000@gmail.com" -ForegroundColor White
    Write-Host "  gogata3001@gmail.com" -ForegroundColor White
    Write-Host "  gogata3002@gmail.com" -ForegroundColor White
    Write-Host "  gogata3003@gmail.com" -ForegroundColor White
    Write-Host "  gogata3004@gmail.com" -ForegroundColor White
    Write-Host "  gogata3005@gmail.com" -ForegroundColor White
    Write-Host "  gogata3006@gmail.com" -ForegroundColor White
    Write-Host "  gogata1905@abv.bg" -ForegroundColor White
    Write-Host "  gogata1905@yahoo.com" -ForegroundColor White
    Write-Host "  gogata1901@gmail.com" -ForegroundColor White
    Write-Host "  georgimarkov1905@gmail.com" -ForegroundColor White
    Write-Host ""
    Write-Host "Сега можеш да се регистрираш отново!" -ForegroundColor Green
    Write-Host ""

    Pause-And-Exit 0

} catch {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Red
    Write-Host "   ГРЕШКА!" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Pause-And-Exit 1

} finally {
    Remove-Item Env:\PGHOST -ErrorAction SilentlyContinue
    Remove-Item Env:\PGPORT -ErrorAction SilentlyContinue
    Remove-Item Env:\PGUSER -ErrorAction SilentlyContinue
    Remove-Item Env:\PGDATABASE -ErrorAction SilentlyContinue
    Remove-Item Env:\PGSSLMODE -ErrorAction SilentlyContinue
}
