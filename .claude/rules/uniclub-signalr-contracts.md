---
trigger: always_on
---

# SignalR Contracts

## Hub Location

- Hub classes: `UniClub-Hub.Server/Hubs/`
- Constants file: `UniClub-Hub.Shared/Constants/SignalREvents.cs`

## Naming Rules

- All Hub method names and client event names must be defined
  as `public const string` in `SignalREvents.cs`.
- Never use raw string literals for SignalR event names in either
  backend or frontend code.

## Example

// SignalREvents.cs
public static class SignalREvents {
public const string TaskStatusUpdated = "TaskStatusUpdated";
public const string MemberJoined = "MemberJoined";
}

// Frontend must import event names from a mirrored constants file,
// not hardcode strings.

## Scope

SignalR is used only in the Operations module.
Do NOT add Hub methods for Membership or Portal features.


