export function generateDeviceId(): string {
    const randomThree = String(Math.floor(100 + Math.random() * 900)); // 3-digit number
    const randomFive = String(Math.floor(10000 + Math.random() * 90000)); // 5-digit number
  
    return `DEV-${randomThree}-${randomFive}`;
  }