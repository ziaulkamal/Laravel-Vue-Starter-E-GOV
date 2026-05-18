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
