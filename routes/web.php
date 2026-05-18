<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Dashboard');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->name('dashboard');

Route::get('/contacts', function () {
    return Inertia::render('Contacts');
})->name('contacts');

Route::get('/kanban', function () {
    return Inertia::render('Kanban');
})->name('kanban');

Route::get('/mail', function () {
    return Inertia::render('Mail');
})->name('mail');

Route::get('/chat', function () {
    return Inertia::render('Chat');
})->name('chat');

Route::get('/settings', function () {
    return Inertia::render('Settings');
})->name('settings');

Route::get('/ui', function () {
    return Inertia::render('UIShowcase');
})->name('ui');

Route::get('/demo/datatable', function () {
    return Inertia::render('Demo/DataTableDemo');
})->name('demo.datatable');

Route::get('/demo/datepicker', function () {
    return Inertia::render('Demo/DatePickerDemo');
})->name('demo.datepicker');

Route::get('/demo/dropzone', function () {
    return Inertia::render('Demo/DropzoneDemo');
})->name('demo.dropzone');

Route::get('/demo/wizard', function () {
    return Inertia::render('Demo/WizardDemo');
})->name('demo.wizard');

// Auth pages
Route::get('/login', function () {
    return Inertia::render('Auth/Login');
})->name('login');

Route::get('/register', function () {
    return Inertia::render('Auth/Register');
})->name('register');

Route::get('/forgot-password', function () {
    return Inertia::render('Auth/ForgotPassword');
})->name('password.request');

// Error pages
Route::get('/404', function () {
    return Inertia::render('Error404');
})->name('error.404');

Route::get('/500', function () {
    return Inertia::render('Error500');
})->name('error.500');

// Sample pages
Route::get('/contacts/{id}', function () {
    return Inertia::render('ContactDetail');
})->name('contacts.show');

Route::get('/contacts/new', function () {
    return Inertia::render('NewContact');
})->name('contacts.new');

Route::get('/icons', function () {
    return Inertia::render('IconGallery');
})->name('icons');

Route::get('/blocks', function () {
    return Inertia::render('BlockSection');
})->name('blocks');
