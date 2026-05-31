<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Auth ──────────────────────────────────────────────────────
Route::get('/login',           fn () => Inertia::render('Auth/Login'))->name('login');
Route::get('/register',        fn () => Inertia::render('Auth/Register'))->name('register');
Route::get('/forgot-password', fn () => Inertia::render('Auth/ForgotPassword'))->name('password.request');

// ── Dashboard ─────────────────────────────────────────────────
Route::get('/',          fn () => Inertia::render('Dashboard'))->name('home');
Route::get('/dashboard', fn () => Inertia::render('Dashboard'))->name('dashboard');

// ── Master Data: Persons ──────────────────────────────────────
Route::get('/persons',           fn () => Inertia::render('Persons/Index'))->name('persons.index');
Route::get('/persons/create',    fn () => Inertia::render('Persons/Form'))->name('persons.create');
Route::get('/persons/{id}',      fn ($id) => Inertia::render('Persons/Show', ['id' => $id]))->name('persons.show');
Route::get('/persons/{id}/edit', fn ($id) => Inertia::render('Persons/Form', ['id' => $id]))->name('persons.edit');

// ── Master Data: Contingents ──────────────────────────────────
Route::get('/contingents',          fn () => Inertia::render('Contingents/Index'))->name('contingents.index');
Route::get('/contingents/create',   fn () => Inertia::render('Contingents/Form'))->name('contingents.create');
Route::get('/contingents/{id}/edit',fn ($id) => Inertia::render('Contingents/Form', ['id' => $id]))->name('contingents.edit');
Route::get('/contingents/{id}',     fn ($id) => Inertia::render('Contingents/Show', ['id' => $id]))->name('contingents.show');

// ── Peserta ───────────────────────────────────────────────────
Route::get('/participants',          fn () => Inertia::render('Participants/Index'))->name('participants.index');
Route::get('/participants/create',   fn () => Inertia::render('Participants/Create'))->name('participants.create');
Route::get('/participants/{id}',     fn ($id) => Inertia::render('Participants/Show', ['id' => $id]))->name('participants.show');
Route::get('/participants/{id}/edit',fn ($id) => Inertia::render('Participants/Edit', ['id' => $id]))->name('participants.edit');

// ── Dokumen ───────────────────────────────────────────────────
Route::get('/documents/review', fn () => Inertia::render('Documents/Review'))->name('documents.review');

// ── Cabor ─────────────────────────────────────────────────────
Route::get('/sports',          fn () => Inertia::render('Sports/Index'))->name('sports.index');
Route::get('/sports/create',   fn () => Inertia::render('Sports/Form'))->name('sports.create');
Route::get('/sports/{id}/edit',fn ($id) => Inertia::render('Sports/Form', ['id' => $id]))->name('sports.edit');
Route::get('/sports/{id}',     fn ($id) => Inertia::render('Sports/Show', ['id' => $id]))->name('sports.show');

// ── Sport Categories ──────────────────────────────────────────
Route::get('/sport-categories',          fn () => Inertia::render('SportCategories/Index'))->name('sport-categories.index');
Route::get('/sport-categories/create',   fn () => Inertia::render('SportCategories/Form'))->name('sport-categories.create');
Route::get('/sport-categories/{id}/edit',fn ($id) => Inertia::render('SportCategories/Form', ['id' => $id]))->name('sport-categories.edit');

// ── Venue ─────────────────────────────────────────────────────
Route::get('/venues',          fn () => Inertia::render('Venues/Index'))->name('venues.index');
Route::get('/venues/create',   fn () => Inertia::render('Venues/Form'))->name('venues.create');
Route::get('/venues/{id}/edit',fn ($id) => Inertia::render('Venues/Form', ['id' => $id]))->name('venues.edit');
Route::get('/venues/{id}',     fn ($id) => Inertia::render('Venues/Show', ['id' => $id]))->name('venues.show');

// ── Pertandingan ──────────────────────────────────────────────
Route::get('/matches',          fn () => Inertia::render('Matches/Index'))->name('matches.index');
Route::get('/matches/create',   fn () => Inertia::render('Matches/Form'))->name('matches.create');
Route::get('/matches/{id}/edit', fn ($id) => Inertia::render('Matches/Form', ['id' => $id]))->name('matches.edit');
Route::get('/matches/{id}',     fn ($id) => Inertia::render('Matches/Show', ['id' => $id]))->name('matches.show');

// ── Juri ──────────────────────────────────────────────────────
Route::get('/judge-scopes',        fn () => Inertia::render('JudgeScopes/Index'))->name('judge-scopes.index');
Route::get('/judges/my-assignments', fn () => Inertia::render('Judges/MyAssignments'))->name('judges.assignments');

// ── Klasemen ──────────────────────────────────────────────────
Route::get('/leaderboard', fn () => Inertia::render('Leaderboard/Index'))->name('leaderboard.index');

// ── Penginapan ────────────────────────────────────────────────
Route::get('/lodgings',        fn () => Inertia::render('Lodgings/Index'))->name('lodgings.index');
Route::get('/lodgings/{id}',   fn ($id) => Inertia::render('Lodgings/Show', ['id' => $id]))->name('lodgings.show');

// ── Kartu Identitas ───────────────────────────────────────────
Route::get('/card-templates',          fn () => Inertia::render('CardTemplates/Index'))->name('card-templates.index');
Route::get('/card-templates/create',   fn () => Inertia::render('CardTemplates/Form'))->name('card-templates.create');
Route::get('/card-templates/{id}/edit',fn ($id) => Inertia::render('CardTemplates/Form', ['id' => $id]))->name('card-templates.edit');

// ── Sistem ────────────────────────────────────────────────────
Route::get('/reports',    fn () => Inertia::render('Reports/Index'))->name('reports.index');
Route::get('/audit-logs', fn () => Inertia::render('AuditLogs/Index'))->name('audit-logs.index');
Route::get('/users',          fn () => Inertia::render('Users/Index'))->name('users.index');
Route::get('/users/create',   fn () => Inertia::render('Users/Form'))->name('users.create');
Route::get('/users/{id}/edit',fn ($id) => Inertia::render('Users/Form', ['id' => $id]))->name('users.edit');
Route::get('/profile',        fn () => Inertia::render('Profile/Index'))->name('profile.index');

// ── Dev / Tools (super-admin only — guard di komponen) ────────
Route::get('/dev/seeder', fn () => Inertia::render('Dev/Seeder'))->name('dev.seeder');

// ── Error pages ───────────────────────────────────────────────
Route::get('/404', fn () => Inertia::render('Error404'))->name('error.404');
Route::get('/500', fn () => Inertia::render('Error500'))->name('error.500');

// ── Laravel storage ───────────────────────────────────────────
Route::get('/up', fn () => response()->json(['status' => 'ok']));
