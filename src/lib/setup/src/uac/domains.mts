export default [
  {
    "name" : "Southern Convergence",
    "key": "",
    "type" : "internal",
    
    "access_policies": ["Role Based"],
    "security_policies": [],

    "access_templates" : [
      {
        "basis": "Role Based",
        "name": "Ultravisor",
        "internal" : true,
        "desc" : "The All-Seeing Eye",
        "resources": []
      },
      {
        "basis"  : "Role Based",
        "name"   : "Hypervisor",
        "internal" : true,
        "desc" : "Like Ultravisor, but with a smaller d*ck",
        "resources" : []
      },
      {
        "basis"  : "Role Based",
        "name"   : "Supervisor",
        "internal" : true,
        "desc" : "Role for the beta cucks out there",
        "resources" : []
      }
    ]
  }
]