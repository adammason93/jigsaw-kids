/* Decisions for a paired child device. The server still allows or refuses
   each request. These rules only decide what this browser does with the
   login it already saved. */
(function (global) {
  "use strict";

  var PAIRING_DISABLED_MESSAGE = "Adding devices is temporarily unavailable. Your family and existing profiles are safe.";

  function bootAction(status, pairCode, hasSession) {
    if (status === "initialising") return "wait";
    if (status === "authenticated" || hasSession) return "restore";
    if (status === "error") return pairCode ? "redeem" : "wait";
    if (pairCode) return "redeem";
    return "join";
  }

  function accessOutcome(reason) {
    if (reason === "allowed") return { action: "open", signOut: false, message: "" };
    if (reason === "device_revoked") {
      return {
        action: "join",
        signOut: true,
        message: "This device has been stopped. Ask a grown-up for a new code."
      };
    }
    if (reason === "profile_unavailable") {
      return {
        action: "keep",
        signOut: false,
        message: "This profile is paused. Ask a grown-up to allow it again."
      };
    }
    if (reason === "not_child") {
      return {
        action: "join",
        signOut: false,
        message: "Ask a grown-up for a pairing code for this device."
      };
    }
    if (reason === "network") {
      return {
        action: "keep",
        signOut: false,
        message: "Wondii could not reach your saved login. This phone stays linked. Try again in a moment."
      };
    }
    return {
      action: "keep",
      signOut: false,
      message: "Wondii could not open just now. This phone stays linked. Try again in a moment."
    };
  }

  function redeemFailureMessage(reason) {
    if (reason === "profile_unavailable") return "This profile is paused. Ask a grown-up to allow it again.";
    if (reason === "limited") return "Too many tries. Wait a little while and ask for a new code.";
    if (reason === "unavailable") return PAIRING_DISABLED_MESSAGE;
    if (reason === "network") return "Wondii could not check that code. Try again in a moment.";
    return "That code has expired or was already used.";
  }

  function stripPair(href) {
    var url = new URL(href, "https://www.wondii.co.uk");
    url.searchParams.delete("pair");
    return url.pathname + url.search + url.hash;
  }

  global.WondiiChildSession = {
    PAIRING_DISABLED_MESSAGE: PAIRING_DISABLED_MESSAGE,
    bootAction: bootAction,
    accessOutcome: accessOutcome,
    redeemFailureMessage: redeemFailureMessage,
    stripPair: stripPair
  };
})(typeof window !== "undefined" ? window : globalThis);
