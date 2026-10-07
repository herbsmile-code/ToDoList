// Firebase web configuration identifies this public web app; it is not an admin
// credential. Database access is enforced by the deployed server rules.
(function(window) {
  'use strict';
  const config = {
    apiKey: 'AIzaSyCehazMGcL2x5FWSRRQv4cqST0AjPIEks8',
    authDomain: 'todolist-jy.firebaseapp.com',
    projectId: 'todolist-jy',
    appId: '1:541071377334:web:61b52c04d09a4536617717'
  };
  const databaseOrigin = 'https://todolist-jy-default-rtdb.asia-southeast1.firebasedatabase.app';

  // The injectable SDK loader keeps authentication tests independent of real
  // accounts, browser profiles, credentials and production Firebase data.
  function createAuth(loadSDK, ownerUid = 'j2XKL3Vob7h4cjTtB3VLUaVzBg33') {
    let initialization, sdk, auth, user = null, initialized = false, version = 0, signedOutLocally = false;
    const listeners = new Set();
    const allowedUser = () => user?.uid === ownerUid && user.emailVerified === true ? user : null;
    const required = () => Object.assign(new Error('Google 계정으로 먼저 로그인해 주세요.'), {kind:'auth-required'});
    const changed = () => { for (const fn of listeners) fn(allowedUser()); };
    async function ready() {
      if (!initialization) initialization = (async () => {
        sdk = await loadSDK();
        auth = sdk.getAuth(sdk.initializeApp(config));
        await auth.authStateReady();
        user = signedOutLocally ? null : auth.currentUser;
        initialized = true;
        sdk.onIdTokenChanged(auth, value => {
          if (signedOutLocally) value = null;
          if (user?.uid !== value?.uid) version++;
          user = value;
          changed();
        });
        return user;
      })().catch(() => {
        initialization = null;
        initialized = false;
        throw Object.assign(new Error('Google 로그인을 준비하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.'), {kind:'auth-required'});
      });
      await initialization;
      return user;
    }
    return {
      ready,
      getUser: allowedUser,
      getVersion: () => version,
      isReady: () => initialized,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      async signIn() {
        await ready();
        const provider = new sdk.GoogleAuthProvider();
        provider.setCustomParameters({prompt:'select_account'});
        try {
          const result = await sdk.signInWithPopup(auth, provider);
          signedOutLocally = false;
          if (user?.uid !== result.user.uid) version++;
          user = result.user;
          changed();
          if (!allowedUser()) throw {code:ownerUid === '__OWNER_FIREBASE_UID__' ? 'auth/owner-not-configured' : 'auth/not-owner'};
          return user;
        }
        catch (error) {
          const messages = {
            'auth/owner-not-configured':'Google 로그인은 완료했습니다. 본인 계정의 접근 설정을 마친 뒤 새로고침해 주세요.',
            'auth/not-owner':'이 Google 계정은 다이어리 소유 계정이 아닙니다. 본인 계정으로 다시 로그인해 주세요.',
            'auth/popup-blocked':'브라우저에서 팝업을 허용한 뒤 Google 로그인을 다시 눌러 주세요.',
            'auth/popup-closed-by-user':'Google 로그인이 취소되었습니다.',
            'auth/cancelled-popup-request':'이미 열려 있는 Google 로그인 창을 확인해 주세요.',
            'auth/unauthorized-domain':'이 앱 주소의 Google 로그인이 아직 허용되지 않았습니다. 관리자에게 문의해 주세요.'
          };
          throw new Error(messages[error?.code] || 'Google 로그인에 실패했습니다. 네트워크와 계정을 확인해 주세요.');
        }
      },
      async signOut() {
        // Invalidate in-flight reads immediately, even if sign-out is delayed.
        signedOutLocally = true; version++; user = null; changed();
        await ready();
        await sdk.signOut(auth);
      },
      async authenticatedUrl(value, forceRefresh = false) {
        // Never send a Firebase ID token to a configurable or redirected host.
        const url = new URL(value);
        if (url.origin !== databaseOrigin || url.username || url.password || url.hash || !url.pathname.endsWith('.json')) {
          throw new Error('허용되지 않은 동기화 서버입니다. 기존 데이터는 유지됩니다.');
        }
        await ready();
        const current = allowedUser(), epoch = version;
        if (!current) throw required();
        let token;
        try { token = await current.getIdToken(forceRefresh); }
        catch { throw required(); }
        if (!token || epoch !== version || current.uid !== user?.uid) throw required();
        url.searchParams.delete('access_token');
        url.searchParams.set('auth', token);
        return url.href;
      }
    };
  }
  window.createCloudFirebaseAuth = createAuth;
  window.CloudFirebaseAuth = createAuth(async () => {
    const [app, auth] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js')
    ]);
    return {...app, ...auth};
  });
})(window);
