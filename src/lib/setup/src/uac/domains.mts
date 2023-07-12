export default [
  {
    "name" : "Southern Convergence",
    "secret_key": "",
    "icon": "/sc.svg",
    "type" : "internal",
    
    "access_policies": ["Role Based"],
    "security_policies": [],

    "access_templates" : [
      {
        "basis": "Role Based",
        "name": "Ultravisor",
        "desc" : "The All-Seeing Eye",
        "resources": []
      },
      {
        "basis"  : "Role Based",
        "name"   : "Hypervisor",
        "desc" : "Like Ultravisor, but with a smaller d*ck",
        "resources" : []
      },
      {
        "basis"  : "Role Based",
        "name"   : "Supervisor",
        "desc" : "Role for the beta cucks out there",
        "resources" : []
      }
    ]
  },
  {
    "name" : "DepEd",
    "secret_key" : "",
    "icon" : "/deped.svg",
    "type" : "external",
    
    "access_policies" : ["Role Based"],
    "security_policies" : [],
    
    "access_templates" : []
  }
]