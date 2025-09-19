import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService, UserPreferences } from '../../core/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastService } from '../../core/toast.service';

@Component({ selector: 'app-profile', templateUrl: './profile.component.html' })
export class ProfileComponent {
  nameForm = this.fb.group({ name: ['', [Validators.required, Validators.minLength(2)]] });
  passForm = this.fb.group({ currentPassword: ['', Validators.required], newPassword: ['', [Validators.required, Validators.minLength(6)]] });
  emailForm = this.fb.group({ newEmail: ['', [Validators.required, Validators.email]] });

  msg = ''; err = ''; loading = false;
  prefsLoading = false;
  prefsForm = this.fb.group({
    locale: ['en'],
    notifications: this.fb.group({ email: [true], sms: [false], push: [true] })
  });

  constructor(
    public auth: AuthService,
    private fb: FormBuilder,
    private i18n: TranslateService,
    private toast: ToastService
  ) {
    const user = this.auth.user;
    if (user) this.nameForm.patchValue({ name: user.name });
    this.loadPrefs();
  }

  saveName() {
    if (this.nameForm.invalid) return;
    this.loading = true; this.err = this.msg = '';
    this.auth.updateProfileName(this.nameForm.value.name || '').subscribe({
      next: () => { this.loading = false; this.msg = this.i18n.instant('profile.toasts.nameSaved'); this.toast.success(this.msg); },
      error: (e) => { this.loading = false; this.err = this.i18n.instant('profile.errors.nameSaveFailed'); this.toast.error(this.err); }
    });
  }

  changePassword() {
    if (this.passForm.invalid) return;
    this.loading = true; this.err = this.msg = '';
    const { currentPassword, newPassword } = this.passForm.value as any;
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => { this.loading = false; this.msg = this.i18n.instant('profile.toasts.passwordChanged'); this.toast.success(this.msg); this.passForm.reset(); },
      error: () => { this.loading = false; this.err = this.i18n.instant('profile.errors.passwordChangeFailed'); this.toast.error(this.err); }
    });
  }

  requestVerify() {
    this.loading = true; this.err = this.msg = '';
    this.auth.requestEmailVerification(window.location.origin).subscribe({
      next: () => { this.loading = false; this.msg = this.i18n.instant('profile.toasts.verificationSent'); this.toast.success(this.msg); },
      error: () => { this.loading = false; this.err = this.i18n.instant('profile.errors.verifyFailed'); this.toast.error(this.err); }
    });
  }

  requestEmailChange() {
    if (this.emailForm.invalid) return;
    this.loading = true; this.err = this.msg = '';
    const { newEmail } = this.emailForm.value as any;
    this.auth.requestEmailChange(newEmail, window.location.origin).subscribe({
      next: () => { this.loading = false; this.msg = this.i18n.instant('profile.toasts.emailChangeRequested'); this.toast.success(this.msg); this.emailForm.reset(); },
      error: () => { this.loading = false; this.err = this.i18n.instant('profile.errors.emailChangeFailed'); this.toast.error(this.err); }
    });
  }

  loadPrefs() {
    this.prefsLoading = true; this.err='';
    this.auth.getPreferences().subscribe({
      next: ({ preferences }) => {
        const p = preferences || {} as UserPreferences;
        this.prefsForm.patchValue({
          locale: p.locale || 'en',
          notifications: {
            email: p.notifications?.email ?? true,
            sms: p.notifications?.sms ?? false,
            push: p.notifications?.push ?? true
          }
        });
        if (p.locale) this.i18n.use(p.locale);
        this.prefsLoading = false;
      },
      error: () => { this.prefsLoading = false; }
    });
  }

  savePrefs() {
    const payload = this.prefsForm.getRawValue() as UserPreferences;
    this.prefsLoading = true; this.msg=''; this.err='';
    this.auth.updatePreferences(payload).subscribe({
      next: () => { this.prefsLoading = false; this.msg = this.i18n.instant('profile.toasts.preferencesSaved'); this.toast.success(this.msg); if (payload.locale) this.i18n.use(payload.locale); },
      error: () => { this.prefsLoading = false; this.err = this.i18n.instant('profile.errors.preferencesSaveFailed'); this.toast.error(this.err); }
    });
  }
}
