$ErrorActionPreference = "Stop"
$email = "module1-smoke-$([guid]::NewGuid().ToString('N'))@example.invalid"
$failure = $null

try {
  $registerBody = @{
    email = $email
    password = "Smoke-test-password-2026!"
    name = "Module 1 Smoke Test"
  } | ConvertTo-Json
  $register = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -SessionVariable session -ContentType "application/json" -Body $registerBody

  $profileBody = @{
    fullName = "Module 1 Smoke Test"
    phone = "0900000000"
    defaultLat = 21.0285
    defaultLng = 105.8542
    defaultAddress = "Hanoi"
  } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:3000/api/profile" -Method Patch -WebSession $session -ContentType "application/json" -Body $profileBody | Out-Null
  $profile = Invoke-RestMethod -Uri "http://localhost:3000/api/profile" -Method Get -WebSession $session
  if ($profile.data.fullName -ne "Module 1 Smoke Test" -or $profile.data.defaultAddress -ne "Hanoi") {
    throw "Profile update did not persist."
  }

  $budgetBody = @{
    month = "2026-09"
    total = "100.00"
    category = "Food"
    categoryLimit = "40.00"
  } | ConvertTo-Json
  $budget = Invoke-RestMethod -Uri "http://localhost:3000/api/budgets" -Method Post -WebSession $session -ContentType "application/json" -Body $budgetBody

  $categoryName = "Smoke-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
  $categoryBody = @{ name = $categoryName; type = "expense" } | ConvertTo-Json
  $category = Invoke-RestMethod -Uri "http://localhost:3000/api/categories" -Method Post -WebSession $session -ContentType "application/json" -Body $categoryBody
  $renamedCategory = "$categoryName-renamed"
  $updateCategoryBody = @{ name = $renamedCategory } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:3000/api/categories/$($category.data.id)" -Method Patch -WebSession $session -ContentType "application/json" -Body $updateCategoryBody | Out-Null
  Invoke-RestMethod -Uri "http://localhost:3000/api/categories/$($category.data.id)" -Method Delete -WebSession $session | Out-Null

  $idempotencyKey = [guid]::NewGuid().ToString()
  $transactionBody = @{
    type = "expense"
    category = "Food"
    amount = "10.00"
    description = "Module 1 smoke test"
    date = "2026-09-29"
  } | ConvertTo-Json
  $idempotencyHeaders = @{ "Idempotency-Key" = $idempotencyKey }
  $transaction = Invoke-RestMethod -Uri "http://localhost:3000/api/transactions" -Method Post -WebSession $session -Headers $idempotencyHeaders -ContentType "application/json" -Body $transactionBody
  $transactionId = $transaction.data.id
  $retry = Invoke-RestMethod -Uri "http://localhost:3000/api/transactions" -Method Post -WebSession $session -Headers $idempotencyHeaders -ContentType "application/json" -Body $transactionBody
  if ($retry.data.id -ne $transaction.data.id) { throw "Transaction retry was not idempotent." }

  $summary = Invoke-RestMethod -Uri "http://localhost:3000/api/budgets?summary=true&month=2026-09" -Method Get -WebSession $session
  if ([decimal]$summary.data.totalBudget -ne 100 -or
      [decimal]$summary.data.totalExpense -ne 10 -or
      [decimal]$summary.data.remaining -ne 90 -or
      [decimal]$summary.data.availableBalance -ne -10) {
    throw "Summary totals did not match the expected budget/transaction values."
  }

  Write-Output "REGISTER=PASS"
  Write-Output "PROFILE=PASS"
  Write-Output "CATEGORY_CRUD=PASS"
  Write-Output "BUDGET_AND_CATEGORY_LIMIT=PASS"
  Write-Output "TRANSACTION_AND_IDEMPOTENCY=PASS"
  Write-Output "SUMMARY=PASS"

  $report = Invoke-RestMethod -Uri "http://localhost:3000/api/reports/spending?period=month&date=2026-09-29" -Method Get -WebSession $session
  if ([decimal]$report.data.totalExpense -ne 10 -or [decimal]$report.data.availableBalance -ne -10) {
    throw "Spending report totals did not match the transaction."
  }
  Write-Output "SPENDING_REPORT=PASS"

  $settingsBody = @{ thresholds = @(20, 50, 90) } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:3000/api/budgets/alerts/settings" -Method Put -WebSession $session -ContentType "application/json" -Body $settingsBody | Out-Null
  $alertSettings = Invoke-RestMethod -Uri "http://localhost:3000/api/budgets/alerts/settings" -Method Get -WebSession $session
  if ($alertSettings.data.thresholds.Count -ne 3) { throw "Alert thresholds were not saved." }
  Write-Output "ALERT_SETTINGS=PASS"

  $firstUpdateBody = @{
    type = "expense"
    category = "Food"
    amount = "15.00"
    description = "Updated smoke test transaction"
    date = "2026-09-29"
  } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:3000/api/transactions/$transactionId" -Method Patch -WebSession $session -ContentType "application/json" -Body $firstUpdateBody | Out-Null
  $updatedBudgetBody = @{
    month = "2026-09"
    total = "150.00"
    category = "Food"
    categoryLimit = "20.00"
  } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:3000/api/budgets/$($budget.data.id)" -Method Patch -WebSession $session -ContentType "application/json" -Body $updatedBudgetBody | Out-Null
  $thresholdTransactionBody = @{
    type = "expense"
    category = "Food"
    amount = "18.00"
    description = "Threshold smoke test"
    date = "2026-09-29"
  } | ConvertTo-Json
  Invoke-RestMethod -Uri "http://localhost:3000/api/transactions/$transactionId" -Method Patch -WebSession $session -ContentType "application/json" -Body $thresholdTransactionBody | Out-Null
  $updatedSummary = Invoke-RestMethod -Uri "http://localhost:3000/api/budgets?summary=true&month=2026-09" -Method Get -WebSession $session
  if ([decimal]$updatedSummary.data.totalBudget -ne 150 -or
      [decimal]$updatedSummary.data.totalExpense -ne 18 -or
      [decimal]$updatedSummary.data.remaining -ne 132) {
    throw "PATCH results did not update the financial summary."
  }
  Write-Output "PATCH_BUDGET_AND_TRANSACTION=PASS"

  $alerts = Invoke-RestMethod -Uri "http://localhost:3000/api/budgets/alerts?month=2026-09" -Method Get -WebSession $session
  if (-not ($alerts.data | Where-Object { $_.category -eq "Food" -and [decimal]$_.thresholdPercent -eq 20 })) {
    throw "Expected food budget alert was not created."
  }
  Write-Output "BUDGET_ALERT=PASS"

  Invoke-RestMethod -Uri "http://localhost:3000/api/transactions/$transactionId" -Method Delete -WebSession $session | Out-Null
  $deletedTransactionSummary = Invoke-RestMethod -Uri "http://localhost:3000/api/budgets?summary=true&month=2026-09" -Method Get -WebSession $session
  if ([decimal]$deletedTransactionSummary.data.totalExpense -ne 0 -or
      [decimal]$deletedTransactionSummary.data.remaining -ne 150) {
    throw "Soft-deleting the transaction did not update summary values."
  }
  Invoke-RestMethod -Uri "http://localhost:3000/api/budgets/$($budget.data.id)" -Method Delete -WebSession $session | Out-Null
  $deletedBudgetSummary = Invoke-RestMethod -Uri "http://localhost:3000/api/budgets?summary=true&month=2026-09" -Method Get -WebSession $session
  if ([decimal]$deletedBudgetSummary.data.totalBudget -ne 0) {
    throw "Soft-deleting the budget did not remove it from summary."
  }
  Write-Output "SOFT_DELETE=PASS"
} catch {
  $failure = $_
  Write-Output "SMOKE_TEST_FAILED: $($_.Exception.Message)"
} finally {
  $cleanupSql = @"
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
DECLARE @uid UNIQUEIDENTIFIER = (SELECT id FROM dbo.users WHERE email = N'$email');
IF @uid IS NOT NULL
BEGIN
    DELETE FROM dbo.transactions WHERE user_id = @uid;
    DELETE FROM dbo.budget_alerts WHERE user_id = @uid;
    DELETE FROM dbo.budget_alert_settings WHERE user_id = @uid;
    DELETE bc FROM dbo.budget_categories AS bc
      INNER JOIN dbo.budgets AS b ON b.id = bc.budget_id
      WHERE b.user_id = @uid;
    DELETE FROM dbo.budgets WHERE user_id = @uid;
    DELETE FROM dbo.profiles WHERE user_id = @uid;
    DELETE FROM dbo.categories WHERE user_id = @uid;
    DELETE FROM dbo.users WHERE id = @uid;
END;
"@
  $cleanupSql | sqlcmd -S "DESKTOP-UG5S7R0\SQLEXPRESS" -E -d DoAn3 -b -W | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Output "TEST_DATA_CLEANUP_FAILED"
    $failure = "Smoke-test data cleanup failed."
  } else {
    Write-Output "TEST_DATA_CLEANUP=PASS"
  }
}

if ($failure) {
  throw $failure
}