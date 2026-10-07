"""Validator for the JSON Schema vocabulary used by our checked-in bundle schema.

Deliberately rejects unsupported schema keywords instead of claiming general JSON
Schema support. No external dependencies are needed to run the author workflow.
"""

def validate_schema(value, schema, root=None, path='$'):
    root=root or schema
    if '$ref' in schema:
        return validate_schema(value,root['$defs'][schema['$ref'].split('/')[-1]],root,path)
    supported={'$schema','title','$defs','$ref','type','const','enum','anyOf','required','properties','additionalProperties','items'}
    unknown=set(schema)-supported
    if unknown:raise ValueError('Unsupported schema keywords: '+str(unknown))
    if 'anyOf' in schema:
        branches=[validate_schema(value,s,root,path) for s in schema['anyOf']]
        if any(not e for e in branches):return []
        return [path+': does not match a supported block shape']
    errors=[]
    typ=schema.get('type')
    types={'object':lambda v:isinstance(v,dict),'array':lambda v:isinstance(v,list),'string':lambda v:isinstance(v,str),'boolean':lambda v:isinstance(v,bool),'number':lambda v:isinstance(v,(int,float)) and not isinstance(v,bool),'integer':lambda v:isinstance(v,int) and not isinstance(v,bool)}
    if typ and not types[typ](value):return [path+': expected '+typ]
    if 'const' in schema and (type(value)!=type(schema['const']) or value!=schema['const']):errors.append(path+': unexpected constant')
    if 'enum' in schema and value not in schema['enum']:errors.append(path+': invalid enum value')
    if isinstance(value,dict):
        for key in schema.get('required',[]):
            if key not in value:errors.append(path+': missing '+key)
        for key,v in value.items():
            if key in schema.get('properties',{}):errors+=validate_schema(v,schema['properties'][key],root,path+'.'+key)
            elif schema.get('additionalProperties') is False:errors.append(path+': unknown field '+key)
    if isinstance(value,list) and 'items' in schema:
        for i,v in enumerate(value):errors+=validate_schema(v,schema['items'],root,f'{path}[{i}]')
    return errors
