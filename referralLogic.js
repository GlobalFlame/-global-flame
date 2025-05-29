// referralLogic.js

const usedCodes = []; // simulate 4-digit code log

function processReferralCode(code, userId) {
  if (!code) {
    return {
      role: 'public',
      commission: 0.00,
      platformFee: 10,
      uploadFee: true,
      referrerType: null
    };
  }

  const isFamily = /^\d{3}$/.test(code);
  const isHelper = /^\d{4}$/.test(code);

  if (isFamily) {
    return {
      role: 'family-referred',
      commission: 0.20,
      platformFee: 0,
      uploadFee: true,
      referrerType: 'family'
    };
  }

  if (isHelper) {
    if (usedCodes.includes(code)) {
      return { error: 'Code already used.' };
    }

    usedCodes.push(code);

    return {
      role: 'flamethrower-referred',
      commission: 0.05,
      platformFee: 5,
      uploadFee: false,
      referrerType: 'helper'
    };
  }

  return {
    role: 'public',
    commission: 0.00,
    platformFee: 10,
    uploadFee: true,
    referrerType: null
  };
}
