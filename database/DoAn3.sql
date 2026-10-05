/*
  DoAn3 SQL Server schema, based on Module 01-07 specifications v3.1.
  Run once in SQL Server Management Studio against a SQL Server 2022+ instance.
  This script creates a new database and all MVP tables. It does not drop data.
  Application code must update updated_at in UTC and enforce cross-row ownership
  rules that cannot be represented by ordinary SQL Server foreign keys.
*/

IF DB_ID(N'DoAn3') IS NULL
BEGIN
    EXEC(N'CREATE DATABASE [DoAn3]');
END;
GO

USE [DoAn3];
GO

CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_users_id DEFAULT NEWSEQUENTIALID(),
    email NVARCHAR(254) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(30) NOT NULL CONSTRAINT DF_users_role DEFAULT N'USER',
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_users_status DEFAULT N'ACTIVE',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT CK_users_role CHECK (role IN (N'USER', N'SUPER_ADMIN', N'CATALOG_ADMIN', N'DATA_OPERATOR')),
    CONSTRAINT CK_users_status CHECK (status IN (N'ACTIVE', N'SUSPENDED', N'PENDING'))
);
GO

CREATE TABLE dbo.profiles (
    user_id UNIQUEIDENTIFIER NOT NULL,
    full_name NVARCHAR(120) NULL,
    phone NVARCHAR(30) NULL,
    default_lat DECIMAL(10,7) NULL,
    default_lng DECIMAL(10,7) NULL,
    default_address NVARCHAR(500) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_profiles_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_profiles_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_profiles PRIMARY KEY (user_id),
    CONSTRAINT FK_profiles_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT CK_profiles_lat CHECK (default_lat IS NULL OR default_lat BETWEEN -90 AND 90),
    CONSTRAINT CK_profiles_lng CHECK (default_lng IS NULL OR default_lng BETWEEN -180 AND 180)
);
GO

CREATE TABLE dbo.categories (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_categories_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NULL,
    name NVARCHAR(80) NOT NULL,
    type NVARCHAR(10) NOT NULL,
    active BIT NOT NULL CONSTRAINT DF_categories_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_categories_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_categories_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_categories PRIMARY KEY (id),
    CONSTRAINT FK_categories_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT CK_categories_type CHECK (type IN (N'INCOME', N'EXPENSE'))
);
GO

CREATE UNIQUE INDEX UX_categories_user_name_type
    ON dbo.categories(user_id, name, type)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX UX_categories_global_name_type
    ON dbo.categories(name, type)
    WHERE user_id IS NULL AND deleted_at IS NULL;
GO

CREATE TABLE dbo.budgets (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_budgets_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_budget DECIMAL(19,2) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_budgets_status DEFAULT N'ACTIVE',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_budgets_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_budgets_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_budgets PRIMARY KEY (id),
    CONSTRAINT FK_budgets_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT CK_budgets_total CHECK (total_budget > 0),
    CONSTRAINT CK_budgets_period CHECK (period_end >= period_start),
    CONSTRAINT CK_budgets_status CHECK (status IN (N'ACTIVE', N'ARCHIVED', N'CANCELLED'))
);
GO

CREATE INDEX IX_budgets_user_period ON dbo.budgets(user_id, period_start, period_end) WHERE deleted_at IS NULL;
GO

CREATE TABLE dbo.budget_categories (
    budget_id UNIQUEIDENTIFIER NOT NULL,
    category_id UNIQUEIDENTIFIER NOT NULL,
    limit_amount DECIMAL(19,2) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_budget_categories_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_budget_categories_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_budget_categories PRIMARY KEY (budget_id, category_id),
    CONSTRAINT FK_budget_categories_budgets FOREIGN KEY (budget_id) REFERENCES dbo.budgets(id) ON DELETE NO ACTION,
    CONSTRAINT FK_budget_categories_categories FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE NO ACTION,
    CONSTRAINT CK_budget_categories_limit CHECK (limit_amount > 0)
);
GO

CREATE TABLE dbo.transactions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_transactions_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    type NVARCHAR(10) NOT NULL,
    category_id UNIQUEIDENTIFIER NOT NULL,
    amount DECIMAL(19,2) NOT NULL,
    note NVARCHAR(1000) NULL,
    transaction_date DATETIME2(3) NOT NULL,
    purchase_id UNIQUEIDENTIFIER NULL,
    idempotency_key NVARCHAR(100) NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_transactions_status DEFAULT N'POSTED',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_transactions_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_transactions_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_transactions PRIMARY KEY (id),
    CONSTRAINT FK_transactions_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_transactions_categories FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE NO ACTION,
    CONSTRAINT CK_transactions_type CHECK (type IN (N'INCOME', N'EXPENSE')),
    CONSTRAINT CK_transactions_amount CHECK (amount > 0),
    CONSTRAINT CK_transactions_status CHECK (status IN (N'POSTED', N'REVERSED'))
);
GO

CREATE INDEX IX_transactions_user_date ON dbo.transactions(user_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IX_transactions_user_category_date ON dbo.transactions(user_id, category_id, transaction_date) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX UX_transactions_idempotency ON dbo.transactions(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX UX_transactions_purchase ON dbo.transactions(purchase_id) WHERE purchase_id IS NOT NULL;
GO

CREATE TABLE dbo.budget_alert_settings (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_budget_alert_settings_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    threshold_percent DECIMAL(5,2) NOT NULL,
    enabled BIT NOT NULL CONSTRAINT DF_budget_alert_settings_enabled DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_budget_alert_settings_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_budget_alert_settings_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_budget_alert_settings PRIMARY KEY (id),
    CONSTRAINT FK_budget_alert_settings_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_budget_alert_settings_user_threshold UNIQUE (user_id, threshold_percent),
    CONSTRAINT CK_budget_alert_settings_threshold CHECK (threshold_percent > 0 AND threshold_percent <= 100)
);
GO

CREATE TABLE dbo.budget_alerts (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_budget_alerts_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    budget_id UNIQUEIDENTIFIER NOT NULL,
    category_id UNIQUEIDENTIFIER NULL,
    threshold_percent DECIMAL(5,2) NOT NULL,
    triggered_at DATETIME2(3) NOT NULL CONSTRAINT DF_budget_alerts_triggered_at DEFAULT SYSUTCDATETIME(),
    acknowledged_at DATETIME2(3) NULL,
    CONSTRAINT PK_budget_alerts PRIMARY KEY (id),
    CONSTRAINT FK_budget_alerts_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_budget_alerts_budgets FOREIGN KEY (budget_id) REFERENCES dbo.budgets(id) ON DELETE NO ACTION,
    CONSTRAINT FK_budget_alerts_categories FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE NO ACTION,
    CONSTRAINT CK_budget_alerts_threshold CHECK (threshold_percent > 0 AND threshold_percent <= 100)
);
GO

CREATE UNIQUE INDEX UX_budget_alerts_budget_total_threshold
    ON dbo.budget_alerts(budget_id, threshold_percent) WHERE category_id IS NULL;
CREATE UNIQUE INDEX UX_budget_alerts_budget_category_threshold
    ON dbo.budget_alerts(budget_id, category_id, threshold_percent) WHERE category_id IS NOT NULL;
GO

CREATE TABLE dbo.ingredients (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ingredients_id DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(160) NOT NULL,
    normalized_name NVARCHAR(200) NOT NULL,
    category NVARCHAR(80) NULL,
    default_unit NVARCHAR(30) NULL,
    active BIT NOT NULL CONSTRAINT DF_ingredients_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_ingredients_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_ingredients_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_ingredients PRIMARY KEY (id)
);
GO

CREATE UNIQUE INDEX UX_ingredients_normalized_name ON dbo.ingredients(normalized_name) WHERE deleted_at IS NULL;
GO

CREATE TABLE dbo.ingredient_aliases (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ingredient_aliases_id DEFAULT NEWSEQUENTIALID(),
    ingredient_id UNIQUEIDENTIFIER NOT NULL,
    alias NVARCHAR(160) NOT NULL,
    normalized_alias NVARCHAR(200) NOT NULL,
    active BIT NOT NULL CONSTRAINT DF_ingredient_aliases_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_ingredient_aliases_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ingredient_aliases PRIMARY KEY (id),
    CONSTRAINT FK_ingredient_aliases_ingredients FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION
);
GO

CREATE UNIQUE INDEX UX_ingredient_aliases_normalized ON dbo.ingredient_aliases(normalized_alias) WHERE active = 1;
GO

CREATE TABLE dbo.ingredient_allergens (
    ingredient_id UNIQUEIDENTIFIER NOT NULL,
    allergen_code NVARCHAR(80) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_ingredient_allergens_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ingredient_allergens PRIMARY KEY (ingredient_id, allergen_code),
    CONSTRAINT FK_ingredient_allergens_ingredients FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION
);
GO

CREATE TABLE dbo.dishes (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_dishes_id DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(160) NOT NULL,
    description NVARCHAR(MAX) NULL,
    cuisine NVARCHAR(80) NULL,
    difficulty NVARCHAR(20) NULL,
    prep_minutes INT NULL,
    servings_base DECIMAL(8,2) NOT NULL CONSTRAINT DF_dishes_servings DEFAULT 1,
    active BIT NOT NULL CONSTRAINT DF_dishes_active DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_dishes_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_dishes_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_dishes PRIMARY KEY (id),
    CONSTRAINT CK_dishes_prep_minutes CHECK (prep_minutes IS NULL OR prep_minutes > 0),
    CONSTRAINT CK_dishes_servings CHECK (servings_base > 0),
    CONSTRAINT CK_dishes_difficulty CHECK (difficulty IS NULL OR difficulty IN (N'EASY', N'MEDIUM', N'HARD'))
);
GO

CREATE TABLE dbo.dish_ingredients (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_dish_ingredients_id DEFAULT NEWSEQUENTIALID(),
    dish_id UNIQUEIDENTIFIER NOT NULL,
    ingredient_id UNIQUEIDENTIFIER NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit NVARCHAR(30) NOT NULL,
    optional_flag BIT NOT NULL CONSTRAINT DF_dish_ingredients_optional DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_dish_ingredients_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_dish_ingredients PRIMARY KEY (id),
    CONSTRAINT FK_dish_ingredients_dishes FOREIGN KEY (dish_id) REFERENCES dbo.dishes(id) ON DELETE NO ACTION,
    CONSTRAINT FK_dish_ingredients_ingredients FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_dish_ingredients_dish_ingredient UNIQUE (dish_id, ingredient_id),
    CONSTRAINT CK_dish_ingredients_quantity CHECK (quantity > 0)
);
GO

CREATE TABLE dbo.dish_ingredient_substitutes (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_dish_ingredient_substitutes_id DEFAULT NEWSEQUENTIALID(),
    dish_ingredient_id UNIQUEIDENTIFIER NOT NULL,
    substitute_ingredient_id UNIQUEIDENTIFIER NOT NULL,
    reason NVARCHAR(500) NOT NULL,
    active BIT NOT NULL CONSTRAINT DF_dish_ingredient_substitutes_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_dish_ingredient_substitutes_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_dish_ingredient_substitutes PRIMARY KEY (id),
    CONSTRAINT FK_dish_ingredient_substitutes_dish_ingredients FOREIGN KEY (dish_ingredient_id) REFERENCES dbo.dish_ingredients(id) ON DELETE NO ACTION,
    CONSTRAINT FK_dish_ingredient_substitutes_ingredients FOREIGN KEY (substitute_ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_dish_ingredient_substitutes_pair UNIQUE (dish_ingredient_id, substitute_ingredient_id)
);
GO

CREATE TABLE dbo.pantry_items (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_pantry_items_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    ingredient_id UNIQUEIDENTIFIER NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit NVARCHAR(30) NOT NULL,
    expires_at DATETIME2(3) NULL,
    note NVARCHAR(500) NULL,
    estimated BIT NOT NULL CONSTRAINT DF_pantry_items_estimated DEFAULT 0,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_pantry_items_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_pantry_items_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_pantry_items PRIMARY KEY (id),
    CONSTRAINT FK_pantry_items_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_pantry_items_ingredients FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION,
    CONSTRAINT CK_pantry_items_quantity CHECK (quantity > 0)
);
GO

CREATE INDEX IX_pantry_items_user_expiry ON dbo.pantry_items(user_id, expires_at) WHERE deleted_at IS NULL;
GO

CREATE TABLE dbo.user_food_preferences (
    user_id UNIQUEIDENTIFIER NOT NULL,
    diet_type NVARCHAR(50) NULL,
    max_prep_minutes INT NULL,
    default_goal NVARCHAR(30) NULL,
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_user_food_preferences_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_user_food_preferences PRIMARY KEY (user_id),
    CONSTRAINT FK_user_food_preferences_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT CK_user_food_preferences_prep CHECK (max_prep_minutes IS NULL OR max_prep_minutes > 0),
    CONSTRAINT CK_user_food_preferences_goal CHECK (default_goal IS NULL OR default_goal IN (N'SAVING', N'BALANCED', N'VARIETY'))
);
GO

CREATE TABLE dbo.user_preferred_cuisines (
    user_id UNIQUEIDENTIFIER NOT NULL,
    cuisine NVARCHAR(80) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_user_preferred_cuisines_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_user_preferred_cuisines PRIMARY KEY (user_id, cuisine),
    CONSTRAINT FK_user_preferred_cuisines_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION
);
GO

CREATE TABLE dbo.user_disliked_ingredients (
    user_id UNIQUEIDENTIFIER NOT NULL,
    ingredient_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_user_disliked_ingredients_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_user_disliked_ingredients PRIMARY KEY (user_id, ingredient_id),
    CONSTRAINT FK_user_disliked_ingredients_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_user_disliked_ingredients_ingredients FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION
);
GO

CREATE TABLE dbo.user_allergies (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_user_allergies_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    allergen_code NVARCHAR(80) NOT NULL,
    ingredient_id UNIQUEIDENTIFIER NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_user_allergies_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_user_allergies PRIMARY KEY (id),
    CONSTRAINT FK_user_allergies_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_user_allergies_ingredients FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION
);
GO

CREATE UNIQUE INDEX UX_user_allergies_code ON dbo.user_allergies(user_id, allergen_code) WHERE ingredient_id IS NULL;
CREATE UNIQUE INDEX UX_user_allergies_ingredient ON dbo.user_allergies(user_id, ingredient_id) WHERE ingredient_id IS NOT NULL;
GO

CREATE TABLE dbo.user_favorite_dishes (
    user_id UNIQUEIDENTIFIER NOT NULL,
    dish_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_user_favorite_dishes_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_user_favorite_dishes PRIMARY KEY (user_id, dish_id),
    CONSTRAINT FK_user_favorite_dishes_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_user_favorite_dishes_dishes FOREIGN KEY (dish_id) REFERENCES dbo.dishes(id) ON DELETE NO ACTION
);
GO

CREATE TABLE dbo.products (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_products_id DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(200) NOT NULL,
    normalized_name NVARCHAR(240) NOT NULL,
    category NVARCHAR(100) NULL,
    brand NVARCHAR(120) NULL,
    size DECIMAL(12,3) NULL,
    size_unit NVARCHAR(30) NULL,
    unit NVARCHAR(30) NULL,
    image_url NVARCHAR(1000) NULL,
    active BIT NOT NULL CONSTRAINT DF_products_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_products_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_products_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_products PRIMARY KEY (id),
    CONSTRAINT CK_products_size CHECK (size IS NULL OR size > 0)
);
GO

CREATE INDEX IX_products_normalized_name ON dbo.products(normalized_name) WHERE deleted_at IS NULL;
GO

CREATE TABLE dbo.stores (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_stores_id DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(200) NOT NULL,
    store_type NVARCHAR(50) NULL,
    brand_name NVARCHAR(120) NULL,
    address NVARCHAR(500) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    phone NVARCHAR(30) NULL,
    website NVARCHAR(1000) NULL,
    active BIT NOT NULL CONSTRAINT DF_stores_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_stores_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_stores_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_stores PRIMARY KEY (id),
    CONSTRAINT CK_stores_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT CK_stores_longitude CHECK (longitude BETWEEN -180 AND 180)
);
GO

CREATE INDEX IX_stores_active_location ON dbo.stores(active, latitude, longitude) WHERE deleted_at IS NULL;
GO

CREATE TABLE dbo.product_sources (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_product_sources_id DEFAULT NEWSEQUENTIALID(),
    source_key NVARCHAR(50) NOT NULL,
    source_type NVARCHAR(30) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_product_sources_status DEFAULT N'ENABLED',
    last_success_at DATETIME2(3) NULL,
    base_url NVARCHAR(1000) NULL,
    refresh_interval_minutes INT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_product_sources_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_product_sources_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_product_sources PRIMARY KEY (id),
    CONSTRAINT UQ_product_sources_source_key UNIQUE (source_key),
    CONSTRAINT CK_product_sources_key CHECK (source_key IN (N'internal', N'csv', N'partner_api', N'authorized_web', N'optional_external_api', N'shopeefood')),
    CONSTRAINT CK_product_sources_type CHECK (source_type IN (N'INTERNAL', N'CSV', N'API', N'AUTHORIZED_WEB')),
    CONSTRAINT CK_product_sources_status CHECK (status IN (N'ENABLED', N'DISABLED', N'DEGRADING', N'FAILED')),
    CONSTRAINT CK_product_sources_interval CHECK (refresh_interval_minutes IS NULL OR refresh_interval_minutes > 0)
);
GO

CREATE TABLE dbo.source_endpoints (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_source_endpoints_id DEFAULT NEWSEQUENTIALID(),
    product_source_id UNIQUEIDENTIFIER NOT NULL,
    endpoint_key NVARCHAR(100) NOT NULL,
    base_url NVARCHAR(1000) NOT NULL,
    enabled BIT NOT NULL CONSTRAINT DF_source_endpoints_enabled DEFAULT 1,
    refresh_interval_minutes INT NULL,
    last_success_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_source_endpoints_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_source_endpoints_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_source_endpoints PRIMARY KEY (id),
    CONSTRAINT FK_source_endpoints_product_sources FOREIGN KEY (product_source_id) REFERENCES dbo.product_sources(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_source_endpoints_source_key UNIQUE (product_source_id, endpoint_key),
    CONSTRAINT CK_source_endpoints_interval CHECK (refresh_interval_minutes IS NULL OR refresh_interval_minutes > 0)
);
GO

CREATE TABLE dbo.store_source_mappings (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_store_source_mappings_id DEFAULT NEWSEQUENTIALID(),
    store_id UNIQUEIDENTIFIER NOT NULL,
    product_source_id UNIQUEIDENTIFIER NOT NULL,
    external_store_id NVARCHAR(200) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    verified_at DATETIME2(3) NULL,
    verified_by UNIQUEIDENTIFIER NULL,
    review_status NVARCHAR(20) NOT NULL CONSTRAINT DF_store_source_mappings_review DEFAULT N'PENDING',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_store_source_mappings_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_store_source_mappings PRIMARY KEY (id),
    CONSTRAINT FK_store_source_mappings_stores FOREIGN KEY (store_id) REFERENCES dbo.stores(id) ON DELETE NO ACTION,
    CONSTRAINT FK_store_source_mappings_sources FOREIGN KEY (product_source_id) REFERENCES dbo.product_sources(id) ON DELETE NO ACTION,
    CONSTRAINT FK_store_source_mappings_reviewers FOREIGN KEY (verified_by) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_store_source_mappings_store_source UNIQUE (store_id, product_source_id),
    CONSTRAINT UQ_store_source_mappings_external UNIQUE (product_source_id, external_store_id),
    CONSTRAINT CK_store_source_mappings_confidence CHECK (confidence BETWEEN 0 AND 1),
    CONSTRAINT CK_store_source_mappings_review CHECK (review_status IN (N'PENDING', N'APPROVED', N'REJECTED'))
);
GO

CREATE TABLE dbo.store_products (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_store_products_id DEFAULT NEWSEQUENTIALID(),
    store_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    price DECIMAL(19,2) NOT NULL,
    available BIT NULL,
    product_url NVARCHAR(1000) NULL,
    product_source_id UNIQUEIDENTIFIER NOT NULL,
    source_product_id NVARCHAR(200) NULL,
    updated_at DATETIME2(3) NOT NULL,
    active BIT NOT NULL CONSTRAINT DF_store_products_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_store_products_created_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_store_products PRIMARY KEY (id),
    CONSTRAINT FK_store_products_stores FOREIGN KEY (store_id) REFERENCES dbo.stores(id) ON DELETE NO ACTION,
    CONSTRAINT FK_store_products_products FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE NO ACTION,
    CONSTRAINT FK_store_products_sources FOREIGN KEY (product_source_id) REFERENCES dbo.product_sources(id) ON DELETE NO ACTION,
    CONSTRAINT CK_store_products_price CHECK (price > 0)
);
GO

CREATE UNIQUE INDEX UX_store_products_current_source
    ON dbo.store_products(store_id, product_id, product_source_id) WHERE deleted_at IS NULL;
CREATE INDEX IX_store_products_product_store ON dbo.store_products(product_id, store_id) WHERE active = 1 AND deleted_at IS NULL;
GO

CREATE TABLE dbo.ingredient_product_mappings (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ingredient_product_mappings_id DEFAULT NEWSEQUENTIALID(),
    ingredient_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    match_method NVARCHAR(20) NOT NULL,
    review_status NVARCHAR(20) NOT NULL CONSTRAINT DF_ingredient_product_mappings_review DEFAULT N'PENDING',
    reviewed_by UNIQUEIDENTIFIER NULL,
    verified_at DATETIME2(3) NULL,
    active BIT NOT NULL CONSTRAINT DF_ingredient_product_mappings_active DEFAULT 1,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_ingredient_product_mappings_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_ingredient_product_mappings_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ingredient_product_mappings PRIMARY KEY (id),
    CONSTRAINT FK_ingredient_product_mappings_ingredients FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION,
    CONSTRAINT FK_ingredient_product_mappings_products FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE NO ACTION,
    CONSTRAINT FK_ingredient_product_mappings_reviewers FOREIGN KEY (reviewed_by) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_ingredient_product_mappings_pair UNIQUE (ingredient_id, product_id),
    CONSTRAINT CK_ingredient_product_mappings_confidence CHECK (confidence BETWEEN 0 AND 1),
    CONSTRAINT CK_ingredient_product_mappings_method CHECK (match_method IN (N'EXACT', N'ALIAS', N'FUZZY', N'SEMANTIC', N'MANUAL')),
    CONSTRAINT CK_ingredient_product_mappings_review CHECK (review_status IN (N'PENDING', N'APPROVED', N'REJECTED'))
);
GO

CREATE TABLE dbo.price_history (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_price_history_id DEFAULT NEWSEQUENTIALID(),
    store_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    product_source_id UNIQUEIDENTIFIER NOT NULL,
    price DECIMAL(19,2) NOT NULL,
    available BIT NULL,
    source_product_id NVARCHAR(200) NULL,
    captured_at DATETIME2(3) NOT NULL CONSTRAINT DF_price_history_captured_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_price_history PRIMARY KEY (id),
    CONSTRAINT FK_price_history_stores FOREIGN KEY (store_id) REFERENCES dbo.stores(id) ON DELETE NO ACTION,
    CONSTRAINT FK_price_history_products FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE NO ACTION,
    CONSTRAINT FK_price_history_sources FOREIGN KEY (product_source_id) REFERENCES dbo.product_sources(id) ON DELETE NO ACTION,
    CONSTRAINT CK_price_history_price CHECK (price > 0)
);
GO

CREATE INDEX IX_price_history_product_store_time ON dbo.price_history(product_id, store_id, captured_at DESC);
GO

CREATE TABLE dbo.meal_plans (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_meal_plans_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    plan_date DATE NOT NULL,
    people_count INT NOT NULL,
    day_count INT NOT NULL,
    goal NVARCHAR(30) NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_meal_plans_status DEFAULT N'DRAFT',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_meal_plans_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_meal_plans_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_meal_plans PRIMARY KEY (id),
    CONSTRAINT FK_meal_plans_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT CK_meal_plans_people CHECK (people_count > 0),
    CONSTRAINT CK_meal_plans_days CHECK (day_count > 0),
    CONSTRAINT CK_meal_plans_goal CHECK (goal IS NULL OR goal IN (N'SAVING', N'BALANCED', N'VARIETY')),
    CONSTRAINT CK_meal_plans_status CHECK (status IN (N'DRAFT', N'ACCEPTED', N'ARCHIVED'))
);
GO

CREATE TABLE dbo.meal_plan_items (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_meal_plan_items_id DEFAULT NEWSEQUENTIALID(),
    meal_plan_id UNIQUEIDENTIFIER NOT NULL,
    dish_id UNIQUEIDENTIFIER NULL,
    day_number INT NOT NULL,
    meal_type NVARCHAR(30) NOT NULL,
    servings DECIMAL(8,2) NOT NULL,
    dish_name_snapshot NVARCHAR(160) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_meal_plan_items_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_meal_plan_items PRIMARY KEY (id),
    CONSTRAINT FK_meal_plan_items_meal_plans FOREIGN KEY (meal_plan_id) REFERENCES dbo.meal_plans(id) ON DELETE NO ACTION,
    CONSTRAINT FK_meal_plan_items_dishes FOREIGN KEY (dish_id) REFERENCES dbo.dishes(id) ON DELETE NO ACTION,
    CONSTRAINT CK_meal_plan_items_day CHECK (day_number > 0),
    CONSTRAINT CK_meal_plan_items_servings CHECK (servings > 0)
);
GO

CREATE TABLE dbo.cart_sessions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_cart_sessions_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    meal_plan_id UNIQUEIDENTIFIER NULL,
    budget_snapshot DECIMAL(19,2) NOT NULL,
    strategy NVARCHAR(30) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_cart_sessions_status DEFAULT N'DRAFT',
    currency CHAR(3) NOT NULL CONSTRAINT DF_cart_sessions_currency DEFAULT 'VND',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_cart_sessions_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_cart_sessions_updated_at DEFAULT SYSUTCDATETIME(),
    deleted_at DATETIME2(3) NULL,
    CONSTRAINT PK_cart_sessions PRIMARY KEY (id),
    CONSTRAINT FK_cart_sessions_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_cart_sessions_meal_plans FOREIGN KEY (meal_plan_id) REFERENCES dbo.meal_plans(id) ON DELETE NO ACTION,
    CONSTRAINT CK_cart_sessions_budget CHECK (budget_snapshot >= 0),
    CONSTRAINT CK_cart_sessions_strategy CHECK (strategy IN (N'WITHIN_BUDGET', N'CHEAPEST', N'NEAREST', N'MOST_COMPLETE', N'BALANCED')),
    CONSTRAINT CK_cart_sessions_status CHECK (status IN (N'DRAFT', N'OPTIMIZED', N'CONFIRMED', N'EXPIRED', N'CANCELLED'))
);
GO

CREATE TABLE dbo.cart_items (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_cart_items_id DEFAULT NEWSEQUENTIALID(),
    cart_id UNIQUEIDENTIFIER NOT NULL,
    store_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    ingredient_id UNIQUEIDENTIFIER NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit NVARCHAR(30) NOT NULL,
    unit_price_snapshot DECIMAL(19,2) NOT NULL,
    line_total AS CONVERT(DECIMAL(19,2), quantity * unit_price_snapshot) PERSISTED,
    product_source_id UNIQUEIDENTIFIER NOT NULL,
    source_updated_at DATETIME2(3) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_cart_items_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_cart_items PRIMARY KEY (id),
    CONSTRAINT FK_cart_items_carts FOREIGN KEY (cart_id) REFERENCES dbo.cart_sessions(id) ON DELETE NO ACTION,
    CONSTRAINT FK_cart_items_stores FOREIGN KEY (store_id) REFERENCES dbo.stores(id) ON DELETE NO ACTION,
    CONSTRAINT FK_cart_items_products FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE NO ACTION,
    CONSTRAINT FK_cart_items_ingredients FOREIGN KEY (ingredient_id) REFERENCES dbo.ingredients(id) ON DELETE NO ACTION,
    CONSTRAINT FK_cart_items_sources FOREIGN KEY (product_source_id) REFERENCES dbo.product_sources(id) ON DELETE NO ACTION,
    CONSTRAINT CK_cart_items_quantity CHECK (quantity > 0),
    CONSTRAINT CK_cart_items_price CHECK (unit_price_snapshot > 0)
);
GO

CREATE INDEX IX_cart_items_cart ON dbo.cart_items(cart_id);
GO

CREATE TABLE dbo.purchases (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_purchases_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    cart_id UNIQUEIDENTIFIER NOT NULL,
    idempotency_key NVARCHAR(100) NOT NULL,
    confirmed_at DATETIME2(3) NULL,
    actual_total DECIMAL(19,2) NOT NULL CONSTRAINT DF_purchases_actual_total DEFAULT 0,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_purchases_status DEFAULT N'PENDING',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_purchases_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_purchases_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_purchases PRIMARY KEY (id),
    CONSTRAINT FK_purchases_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT FK_purchases_carts FOREIGN KEY (cart_id) REFERENCES dbo.cart_sessions(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_purchases_cart UNIQUE (cart_id),
    CONSTRAINT UQ_purchases_user_idempotency UNIQUE (user_id, idempotency_key),
    CONSTRAINT CK_purchases_total CHECK (actual_total >= 0),
    CONSTRAINT CK_purchases_status CHECK (status IN (N'PENDING', N'CONFIRMED', N'CANCELLED')),
    CONSTRAINT CK_purchases_confirmation CHECK ((status = N'CONFIRMED' AND confirmed_at IS NOT NULL) OR status <> N'CONFIRMED')
);
GO

CREATE TABLE dbo.purchase_items (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_purchase_items_id DEFAULT NEWSEQUENTIALID(),
    purchase_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    store_id UNIQUEIDENTIFIER NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit NVARCHAR(30) NOT NULL,
    snapshot_price DECIMAL(19,2) NOT NULL,
    actual_price DECIMAL(19,2) NOT NULL,
    product_source_id UNIQUEIDENTIFIER NOT NULL,
    source_updated_at DATETIME2(3) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_purchase_items_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_purchase_items PRIMARY KEY (id),
    CONSTRAINT FK_purchase_items_purchases FOREIGN KEY (purchase_id) REFERENCES dbo.purchases(id) ON DELETE NO ACTION,
    CONSTRAINT FK_purchase_items_products FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE NO ACTION,
    CONSTRAINT FK_purchase_items_stores FOREIGN KEY (store_id) REFERENCES dbo.stores(id) ON DELETE NO ACTION,
    CONSTRAINT FK_purchase_items_sources FOREIGN KEY (product_source_id) REFERENCES dbo.product_sources(id) ON DELETE NO ACTION,
    CONSTRAINT CK_purchase_items_quantity CHECK (quantity > 0),
    CONSTRAINT CK_purchase_items_snapshot_price CHECK (snapshot_price > 0),
    CONSTRAINT CK_purchase_items_actual_price CHECK (actual_price >= 0)
);
GO

ALTER TABLE dbo.transactions
    ADD CONSTRAINT FK_transactions_purchases FOREIGN KEY (purchase_id) REFERENCES dbo.purchases(id) ON DELETE NO ACTION;
GO

CREATE TABLE dbo.ai_requests (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ai_requests_id DEFAULT NEWSEQUENTIALID(),
    request_id NVARCHAR(100) NOT NULL,
    user_id UNIQUEIDENTIFIER NULL,
    module NVARCHAR(50) NOT NULL,
    model NVARCHAR(120) NULL,
    latency_ms INT NULL,
    input_summary NVARCHAR(MAX) NULL,
    output_summary NVARCHAR(MAX) NULL,
    validation_status NVARCHAR(20) NOT NULL,
    fallback_used BIT NOT NULL CONSTRAINT DF_ai_requests_fallback DEFAULT 0,
    status NVARCHAR(20) NOT NULL,
    error_code NVARCHAR(80) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_ai_requests_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ai_requests PRIMARY KEY (id),
    CONSTRAINT UQ_ai_requests_request_id UNIQUE (request_id),
    CONSTRAINT FK_ai_requests_users FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT CK_ai_requests_latency CHECK (latency_ms IS NULL OR latency_ms >= 0),
    CONSTRAINT CK_ai_requests_validation CHECK (validation_status IN (N'VALID', N'INVALID', N'NOT_APPLICABLE')),
    CONSTRAINT CK_ai_requests_status CHECK (status IN (N'SUCCESS', N'FAILED', N'TIMEOUT', N'FALLBACK'))
);
GO

CREATE INDEX IX_ai_requests_user_created ON dbo.ai_requests(user_id, created_at DESC);
GO

CREATE TABLE dbo.ai_request_contexts (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ai_request_contexts_id DEFAULT NEWSEQUENTIALID(),
    ai_request_id UNIQUEIDENTIFIER NOT NULL,
    entity_type NVARCHAR(40) NOT NULL,
    entity_id UNIQUEIDENTIFIER NOT NULL,
    context_role NVARCHAR(30) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_ai_request_contexts_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ai_request_contexts PRIMARY KEY (id),
    CONSTRAINT FK_ai_request_contexts_requests FOREIGN KEY (ai_request_id) REFERENCES dbo.ai_requests(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_ai_request_contexts_entity UNIQUE (ai_request_id, entity_type, entity_id),
    CONSTRAINT CK_ai_request_contexts_type CHECK (entity_type IN (N'DISH', N'INGREDIENT', N'PRODUCT', N'STORE', N'CART', N'MEAL_PLAN'))
);
GO

CREATE TABLE dbo.import_batches (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_import_batches_id DEFAULT NEWSEQUENTIALID(),
    product_source_id UNIQUEIDENTIFIER NOT NULL,
    operator_user_id UNIQUEIDENTIFIER NULL,
    file_name NVARCHAR(260) NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_import_batches_status DEFAULT N'RECEIVED',
    row_count INT NOT NULL CONSTRAINT DF_import_batches_row_count DEFAULT 0,
    success_count INT NOT NULL CONSTRAINT DF_import_batches_success_count DEFAULT 0,
    error_count INT NOT NULL CONSTRAINT DF_import_batches_error_count DEFAULT 0,
    started_at DATETIME2(3) NOT NULL CONSTRAINT DF_import_batches_started_at DEFAULT SYSUTCDATETIME(),
    completed_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_import_batches_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_import_batches PRIMARY KEY (id),
    CONSTRAINT FK_import_batches_sources FOREIGN KEY (product_source_id) REFERENCES dbo.product_sources(id) ON DELETE NO ACTION,
    CONSTRAINT FK_import_batches_operators FOREIGN KEY (operator_user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION,
    CONSTRAINT CK_import_batches_status CHECK (status IN (N'RECEIVED', N'VALIDATING', N'REVIEW', N'COMMITTED', N'FAILED')),
    CONSTRAINT CK_import_batches_counts CHECK (row_count >= 0 AND success_count >= 0 AND error_count >= 0)
);
GO

CREATE TABLE dbo.staging_products (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_staging_products_id DEFAULT NEWSEQUENTIALID(),
    batch_id UNIQUEIDENTIFIER NOT NULL,
    external_id NVARCHAR(200) NULL,
    raw_name NVARCHAR(500) NULL,
    raw_price NVARCHAR(100) NULL,
    raw_available NVARCHAR(50) NULL,
    raw_url NVARCHAR(1000) NULL,
    raw_updated_at NVARCHAR(100) NULL,
    raw_store_external_id NVARCHAR(200) NULL,
    row_no INT NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_staging_products_status DEFAULT N'PENDING',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_staging_products_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_staging_products PRIMARY KEY (id),
    CONSTRAINT FK_staging_products_batches FOREIGN KEY (batch_id) REFERENCES dbo.import_batches(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_staging_products_batch_row UNIQUE (batch_id, row_no),
    CONSTRAINT CK_staging_products_row CHECK (row_no > 0),
    CONSTRAINT CK_staging_products_status CHECK (status IN (N'PENDING', N'VALID', N'REVIEW', N'COMMITTED', N'REJECTED'))
);
GO

CREATE TABLE dbo.staging_stores (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_staging_stores_id DEFAULT NEWSEQUENTIALID(),
    batch_id UNIQUEIDENTIFIER NOT NULL,
    external_store_id NVARCHAR(200) NULL,
    raw_name NVARCHAR(500) NULL,
    raw_address NVARCHAR(1000) NULL,
    raw_latitude NVARCHAR(100) NULL,
    raw_longitude NVARCHAR(100) NULL,
    row_no INT NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_staging_stores_status DEFAULT N'PENDING',
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_staging_stores_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_staging_stores PRIMARY KEY (id),
    CONSTRAINT FK_staging_stores_batches FOREIGN KEY (batch_id) REFERENCES dbo.import_batches(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_staging_stores_batch_row UNIQUE (batch_id, row_no),
    CONSTRAINT CK_staging_stores_row CHECK (row_no > 0),
    CONSTRAINT CK_staging_stores_status CHECK (status IN (N'PENDING', N'VALID', N'REVIEW', N'COMMITTED', N'REJECTED'))
);
GO

CREATE TABLE dbo.staging_errors (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_staging_errors_id DEFAULT NEWSEQUENTIALID(),
    batch_id UNIQUEIDENTIFIER NOT NULL,
    row_no INT NOT NULL,
    field_name NVARCHAR(120) NULL,
    error_code NVARCHAR(80) NOT NULL,
    message NVARCHAR(1000) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_staging_errors_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_staging_errors PRIMARY KEY (id),
    CONSTRAINT FK_staging_errors_batches FOREIGN KEY (batch_id) REFERENCES dbo.import_batches(id) ON DELETE NO ACTION,
    CONSTRAINT CK_staging_errors_row CHECK (row_no > 0)
);
GO

CREATE TABLE dbo.audit_logs (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_audit_logs_id DEFAULT NEWSEQUENTIALID(),
    actor_user_id UNIQUEIDENTIFIER NULL,
    event_type NVARCHAR(60) NOT NULL,
    entity_type NVARCHAR(80) NOT NULL,
    entity_id UNIQUEIDENTIFIER NULL,
    source_key NVARCHAR(50) NULL,
    old_value_summary NVARCHAR(MAX) NULL,
    new_value_summary NVARCHAR(MAX) NULL,
    result_status NVARCHAR(30) NULL,
    error_code NVARCHAR(80) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_audit_logs_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_audit_logs PRIMARY KEY (id),
    CONSTRAINT FK_audit_logs_users FOREIGN KEY (actor_user_id) REFERENCES dbo.users(id) ON DELETE NO ACTION
);
GO

CREATE INDEX IX_audit_logs_entity_time ON dbo.audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IX_audit_logs_event_time ON dbo.audit_logs(event_type, created_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IS NULL AND name = N'Food' AND type = N'EXPENSE')
    INSERT dbo.categories(name, type) VALUES (N'Food', N'EXPENSE');
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IS NULL AND name = N'Transport' AND type = N'EXPENSE')
    INSERT dbo.categories(name, type) VALUES (N'Transport', N'EXPENSE');
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IS NULL AND name = N'Shopping' AND type = N'EXPENSE')
    INSERT dbo.categories(name, type) VALUES (N'Shopping', N'EXPENSE');
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IS NULL AND name = N'Entertainment' AND type = N'EXPENSE')
    INSERT dbo.categories(name, type) VALUES (N'Entertainment', N'EXPENSE');
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IS NULL AND name = N'Bills' AND type = N'EXPENSE')
    INSERT dbo.categories(name, type) VALUES (N'Bills', N'EXPENSE');
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IS NULL AND name = N'Other' AND type = N'EXPENSE')
    INSERT dbo.categories(name, type) VALUES (N'Other', N'EXPENSE');
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IS NULL AND name = N'Salary' AND type = N'INCOME')
    INSERT dbo.categories(name, type) VALUES (N'Salary', N'INCOME');
IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE user_id IS NULL AND name = N'Other income' AND type = N'INCOME')
    INSERT dbo.categories(name, type) VALUES (N'Other income', N'INCOME');

IF NOT EXISTS (SELECT 1 FROM dbo.product_sources WHERE source_key = N'internal')
    INSERT dbo.product_sources(source_key, source_type, status) VALUES (N'internal', N'INTERNAL', N'ENABLED');
IF NOT EXISTS (SELECT 1 FROM dbo.product_sources WHERE source_key = N'csv')
    INSERT dbo.product_sources(source_key, source_type, status) VALUES (N'csv', N'CSV', N'ENABLED');
IF NOT EXISTS (SELECT 1 FROM dbo.product_sources WHERE source_key = N'partner_api')
    INSERT dbo.product_sources(source_key, source_type, status) VALUES (N'partner_api', N'API', N'DISABLED');
IF NOT EXISTS (SELECT 1 FROM dbo.product_sources WHERE source_key = N'authorized_web')
    INSERT dbo.product_sources(source_key, source_type, status) VALUES (N'authorized_web', N'AUTHORIZED_WEB', N'DISABLED');

GO

CREATE OR ALTER VIEW dbo.vw_user_financial_balance
AS
    SELECT
        user_id,
        SUM(CASE WHEN type = N'INCOME' THEN amount ELSE -amount END) AS available_balance
    FROM dbo.transactions
    WHERE status = N'POSTED' AND deleted_at IS NULL
    GROUP BY user_id;
GO

CREATE OR ALTER VIEW dbo.vw_budget_utilization
AS
    SELECT
        b.id AS budget_id,
        b.user_id,
        b.period_start,
        b.period_end,
        CAST(NULL AS UNIQUEIDENTIFIER) AS category_id,
        N'TOTAL' AS budget_scope,
        b.total_budget AS limit_amount,
        CAST(COALESCE(SUM(t.amount), 0) AS DECIMAL(19,2)) AS spent_amount,
        CAST(b.total_budget - COALESCE(SUM(t.amount), 0) AS DECIMAL(19,2)) AS remaining_amount
    FROM dbo.budgets AS b
    LEFT JOIN dbo.transactions AS t
        ON t.user_id = b.user_id
        AND t.type = N'EXPENSE'
        AND t.status = N'POSTED'
        AND t.deleted_at IS NULL
        AND t.transaction_date >= CAST(b.period_start AS DATETIME2(3))
        AND t.transaction_date < DATEADD(DAY, 1, CAST(b.period_end AS DATETIME2(3)))
    WHERE b.deleted_at IS NULL AND b.status = N'ACTIVE'
    GROUP BY b.id, b.user_id, b.period_start, b.period_end, b.total_budget

    UNION ALL

    SELECT
        b.id AS budget_id,
        b.user_id,
        b.period_start,
        b.period_end,
        bc.category_id,
        N'CATEGORY' AS budget_scope,
        bc.limit_amount,
        CAST(COALESCE(SUM(t.amount), 0) AS DECIMAL(19,2)) AS spent_amount,
        CAST(bc.limit_amount - COALESCE(SUM(t.amount), 0) AS DECIMAL(19,2)) AS remaining_amount
    FROM dbo.budgets AS b
    INNER JOIN dbo.budget_categories AS bc ON bc.budget_id = b.id
    LEFT JOIN dbo.transactions AS t
        ON t.user_id = b.user_id
        AND t.category_id = bc.category_id
        AND t.type = N'EXPENSE'
        AND t.status = N'POSTED'
        AND t.deleted_at IS NULL
        AND t.transaction_date >= CAST(b.period_start AS DATETIME2(3))
        AND t.transaction_date < DATEADD(DAY, 1, CAST(b.period_end AS DATETIME2(3)))
    WHERE b.deleted_at IS NULL AND b.status = N'ACTIVE'
    GROUP BY b.id, b.user_id, b.period_start, b.period_end, bc.category_id, bc.limit_amount;
GO

PRINT N'DoAn3 database schema created. Configure application services to use this database.';
GO