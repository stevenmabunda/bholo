export default function DeleteAccountPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <p>
        You can request that your BHOLO account and all associated data be
        deleted at any time.
      </p>

      <h2>How to request deletion</h2>
      <p>
        Email{' '}
        <a href="mailto:support@bholofootball.co.za?subject=Delete%20my%20account">
          support@bholofootball.co.za
        </a>{' '}
        from the address registered on your account, with the subject line
        &ldquo;Delete my account&rdquo;. Include the email or handle your
        account uses if it differs from the one you&apos;re writing from.
      </p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your profile, including name, handle and profile photo</li>
        <li>Your posts, comments, likes and votes</li>
        <li>Your direct messages</li>
        <li>Your login credentials</li>
      </ul>

      <h2>Timeline</h2>
      <p>
        We process deletion requests within 30 days. Some information may be
        retained for a limited period where required for fraud prevention,
        security, or to comply with legal obligations, consistent with our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </div>
  );
}
