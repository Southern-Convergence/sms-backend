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
        "name"   : "Deped HRDD Regular",
        "desc" : "",
        "resources" : []
      },
      {
        "basis"  : "Role Based",
        "name"   : "DepEd HRDD Admin",
        "desc" : "",
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