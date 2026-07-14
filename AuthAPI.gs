/* ============================================================
   AuthAPI.gs — Token-Based Authentication for External API
   Standard-021: Enterprise Architecture Migration
   ============================================================ */

var AUTH_CONFIG = {
  TOKEN_LENGTH: 64,
  TOKEN_EXPIRY_HOURS: 24,
  MAX_ACTIVE_TOKENS: 5,
  TOKEN_PREFIX: 'api_token_',
  TOKEN_USER_PREFIX: 'api_tokens_'
};

function generateApiToken(email, role, name, department) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var token = '';
  for (var i = 0; i < AUTH_CONFIG.TOKEN_LENGTH; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  var props = PropertiesService.getScriptProperties();
  var tokenData = JSON.stringify({
    email: email,
    role: role || '',
    name: name || '',
    department: department || '',
    created: new Date().toISOString(),
    expires: new Date(Date.now() + AUTH_CONFIG.TOKEN_EXPIRY_HOURS * 3600000).toISOString()
  });
  props.setProperty(AUTH_CONFIG.TOKEN_PREFIX + token, tokenData);
  var userTokensStr = props.getProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + email);
  var userTokens = userTokensStr ? JSON.parse(userTokensStr) : [];
  userTokens.push({ token: token, created: new Date().toISOString() });
  if (userTokens.length > AUTH_CONFIG.MAX_ACTIVE_TOKENS) {
    var removed = userTokens.splice(0, userTokens.length - AUTH_CONFIG.MAX_ACTIVE_TOKENS);
    removed.forEach(function(t) {
      props.deleteProperty(AUTH_CONFIG.TOKEN_PREFIX + t.token);
    });
  }
  props.setProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + email, JSON.stringify(userTokens));
  return token;
}

function validateApiToken(token) {
  if (!token || typeof token !== 'string') return null;
  var props = PropertiesService.getScriptProperties();
  var tokenDataStr = props.getProperty(AUTH_CONFIG.TOKEN_PREFIX + token);
  if (!tokenDataStr) return null;
  try {
    var tokenData = JSON.parse(tokenDataStr);
    if (new Date(tokenData.expires) < new Date()) {
      invalidateApiToken(token);
      return null;
    }
    return tokenData;
  } catch(e) {
    return null;
  }
}

function invalidateApiToken(token) {
  if (!token) return;
  var props = PropertiesService.getScriptProperties();
  var tokenDataStr = props.getProperty(AUTH_CONFIG.TOKEN_PREFIX + token);
  if (tokenDataStr) {
    try {
      var tokenData = JSON.parse(tokenDataStr);
      props.deleteProperty(AUTH_CONFIG.TOKEN_PREFIX + token);
      var userTokensStr = props.getProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + tokenData.email);
      if (userTokensStr) {
        var userTokens = JSON.parse(userTokensStr);
        userTokens = userTokens.filter(function(t) { return t.token !== token; });
        props.setProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + tokenData.email, JSON.stringify(userTokens));
      }
    } catch(e) {
      props.deleteProperty(AUTH_CONFIG.TOKEN_PREFIX + token);
    }
  }
}

function invalidateAllUserTokens(email) {
  var props = PropertiesService.getScriptProperties();
  var userTokensStr = props.getProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + email);
  if (userTokensStr) {
    var userTokens = JSON.parse(userTokensStr);
    userTokens.forEach(function(t) {
      props.deleteProperty(AUTH_CONFIG.TOKEN_PREFIX + t.token);
    });
    props.deleteProperty(AUTH_CONFIG.TOKEN_USER_PREFIX + email);
  }
}

function apiLogin(email, password) {
  var result = loginUser(email, password);
  if (result.success) {
    var token = generateApiToken(
      email,
      result.user.role,
      result.user.name,
      result.user.department
    );
    result.token = token;
    result.expires = new Date(Date.now() + AUTH_CONFIG.TOKEN_EXPIRY_HOURS * 3600000).toISOString();
  }
  return result;
}

function apiLogout(token) {
  invalidateApiToken(token);
  return { success: true, message: 'Logged out successfully' };
}
