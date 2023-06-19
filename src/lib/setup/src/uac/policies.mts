export default [
  {
    "name": "Role Based",
    "type": "access",
    "desc": "Privileges are granted through the assignment of the 'role' attribute.",
    "attr": "role",
    "icon": "mdi-badge-account"
  },
  {
    "name": "Schedule Based",
    "type": "access",
    "desc": "Privileges are granted within a specified schedule.",
    "attr": "schedule",
    "icon": "mdi-update"
  },
  {
    "name": "Claim Based",
    "type": "access",
    "desc": "Privileges are dependent on resource ownership.",
    "attr": "ownership",
    "icon": "mdi-hand-extended"
  },
  {
    "name": "Location Based",
    "type": "access",
    "desc": "Privileges are dependent on geographic locality.",
    "attr": "location",
    "icon": "mdi-map"
  },
  {
    "name": "MFA Policy",
    "type": "security",
    "desc": "Outlines the various ways of multi-factor authentication for a given domain.",
    "icon": "mdi-key-change",
    "sub_policies": [
      {
        "name": "Knowledge Factor",
        "desc": "Authentication challenge which requires a user's knowledge of an answer to a secret question"
      },
      {
        "name": "Possession Factor",
        "desc": "Authentication challenge which requires a user to have physical access to a phone, a usb-drive or any token-device."
      },
      {
        "name": "Inherent Factor",
        "desc": "Authentication challenge which requires a user to present attributes associated with a user, such as biometric signatures, behavioral signatures, etc."
      }
    ]
  },
  {
    "name": "Password Policy",
    "type": "security",
    "desc": "A set of policies which governs a domain's rules of storing, handling and the re-assignment of passwords.",
    "icon": "mdi-form-textbox-password",
    "sub_policies": [
      {
        "name": "Historical Checking",
        "desc": "Allow the re-assignment of previously used passwords."
      },
      {
        "name": "Pattern Checking",
        "desc": "Specify a domain-wide pattern for passwords."
      }
    ]
  },
  {
    "name": "Attempt Policy",
    "type": "security",
    "desc": "A set of policies which governs a domain's behavior for all intercepted login attempts.",
    "icon": "mdi-key-remove",
    "sub_policies": [
      {
        "name": "Attempt Counting",
        "desc": "Consecutive failed attempts are intercepted, a trigger response is sent once a threshold limit has been reached."
      },
      {
        "name": "Location Profiling (Anomalous Location)",
        "desc": "IP Address of a login attempt is stored and matched against an IP Lookup Table."
      }
    ]
  },
  {
    "name": "Session Management Policy",
    "type": "security",
    "desc": "A set of policies which dictates a domain's behavior on ongoing sessions.",
    "icon": "mdi-account-convert",
    "sub_policies": [
      {
        "name": "Idle Account Checking",
        "desc": "Describes a domain's behavior to inactive/unresponsive sessions."
      }
    ]
  },
  {
    "name": "Account Management Policy",
    "type": "security",
    "desc": "A set of policies which outlines a domain and it's users ability to disable, suspend or modify user accounts.",
    "icon": "mdi-account-edit",
    "sub_policies": [
      {
        "name": "Account Creation/Invitation",
        "desc": "Allows users with sufficient privileges to create/invite a user."
      },
      {
        "name": "Account Suspension",
        "desc": "Allows users with sufficient privileges to suspend an account within their discretion."
      },
      {
        "name": "Account Modification",
        "desc": "Allows users with sufficient privileges to modify an account within their discretion."
      },
      {
        "name": "Account Purging",
        "desc": "Allows users with sufficient privileges to entirely purge an account from a given domain."
      }
    ]
  }
]