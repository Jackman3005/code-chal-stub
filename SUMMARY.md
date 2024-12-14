# Jack's Code Challenge Experience

## Pre-start setup
- First time using MongoDB. Considered switching to postgres, but figured I'd stick with the stack as is.
- Setup a MongoDB Atlas account and created a free cluster.
    - Later I discovered Vercel was timing out when I was trying to sign in because the default MongoDB Atlas setup limits inbound access to the ip address you are using when initially setting up.
      After a bit of logging and re-thinking I remembered the ip allowlist mention during setup and changed it to allow all ip addresses.
- Was initially confused why I could not login to the app, realised the username needed to be an email. After playing around
  in the credentials provider code, I decided to clean it up a bit to make it easier for me to understand next time.

## The Challenge
- Opened the email at 1:55pm
- Had a few small breaks totaling about 20 minutes
- Stopped coding at 4:50pm to write summary

### Thoughts on abuse detection

Observe active sessions:
- Multiple ip addresses for active sessions
- Multiple devices for active sessions
- Multiple sessions in use simultaneously, especially if different ip addresses or devices

Reduce abusers ability to login:
- Require 2FA for logins from new devices or IPs
- Limit the number of devices that can be logged in at once, removing oldest active session if limit is reached.


### Thoughts on enforcement
Systems like these can be really painful if overly aggressive especially since false positives are a real possibility.

I would start by monitoring only, creating an abuse rating of some sort for each user. Allowing Admins to review the details
of users and their sessions to sanity check that the ratings are deserved and accurate. First we should build the highest confidence in
the highest abuse rating category. Once we feel it has near zero false positives, we can start to enforce restrictions on those users.
I would then rinse and repeat for the next abuse category down, such as automated warnings, etc.

Some enforcement like 2FA for new devices could be implemented immediately as it is a low risk action and the criteria
for requiring 2FA is clear and reliable.

### Device Fingerprint implementation
- I want to record the device fingerprint during login, it does not
  appear that I have a way of altering the signin page provided by
  next-auth to just add the bit of JS I need to add the fingerprint to
  a cookie or other field that could be posted in the body on submit
  and then later consumed in the `authorize` method to store in the user's session.
- I started creating a custom signin form, but this I think will take
  too long, so I am postponing for now. Code available on `add-fingerprint-js` branch.

## Post Challenge Summary

Deployed to Vercel: [https://code-chal-stub.vercel.app](https://code-chal-stub.vercel.app)


### What I did
I was able to add a few new metrics to track for user sessions to prepare to detect abuse, issue warnings, and outright ban users.
I added the following fields to `Session`:
- `ipAddress`
- `lastSeenAt`
- I aborted adding `deviceFingerprint` to avoid spending too much time there. I think this is important, but I didn't want to get hung up for too long during the challenge.

I created a `/admin` route that allows users with the `isQuickliAdmin` field set to `true` to view all users that have active sessions and get a summary of their session counts, unique ip address counts and abuse rating.
Currently this is all rather basic and not incredibly useful, but may actually identify the worst offenders in its current state.

See [Screenshot of Admin Panel](./admin-view.png)

### What I'd like to do
- I would add more metrics to sessions like device fingerprint through FingerprintJS or similar and encorporate that into the abuse rating.
- I would add 2fa enforcement for new logins on new devices or IPs. (Scan previous sessions even if inactive, possibly up to a threshold of x days in the past)
- I would provide more functionality for admins to manually remove sessions, possibly force logout of all devices and require 2fa for next login, possibly ban users or manually issue warning emails.
- Once the system is in place for a bit and the kinks are worked out, I would start automating enforcement on users with obvious signs of abuse.
- Possibly limit active sessions per user to a reasonable number, such as 3. If a 4th session is started, we could remove the oldest `lastSeenAt` session.
- During this session, I went a bit quicker than I normally would for a problem like this. I would revisit the library choices and check alternatives.
  I would probably read some blogs or articles on this topic as a whole to get my mind in the right place for this kind of work.
- I would revisit some of the access controls to ensure I didn't miss anything that could be a security risk. Especially in regards to information accessed from the admin screen.
- Unfortunately the `/admin` route was not working on Vercel, despite ensuring the `isQuickliAdmin` field was set to `true` for `angus@quickli.com.au`.
  I didn't want to spend more time on the challenge as per the request, but I'm sure it's a simple mistake. It works locally fine though :/


### Rollout plan
- Add tracking measures and an admin panel for monitoring users with high abuse ratings
- Spend a week or month monitoring and verifying the metrics are accurate and the abuse ratings are reliable
- Create a 3-strikes type system for the worst abusers, with the first strike being a warning email, the second strike being a temporary ban, and the third strike being a permanent ban. I'm open to different approaches here, but I think this is a decent start.
- After the system has been in place for a while and the kinks are worked out, start automating immediate enforcement on users with obvious signs of abuse.
