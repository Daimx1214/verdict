<Heading
  as={"h1"}
  className={"openapi__heading"}
  children={"sdk_v1_get_identities"}
>

<MethodEndpoint
  method={"get"}
  path={"/api/v1/identities/"}
  context={"endpoint"}
>
  

Retrieve the flags and traits for an identity.

<Heading
  id={"request"}
  as={"h2"}
  className={"openapi-tabs__heading"}
  children={"Request"}
>

<ParamsDetails
  parameters={[{"name":"identifier","in":"query","required":true,"schema":{"type":"string","minLength":1}},{"name":"transient","in":"query","schema":{"type":"boolean","default":false}}]}
>
  

<RequestSchema
  title={"Body"}
  body={undefined}
>
  

<StatusCodes
  id={undefined}
  label={undefined}
  responses={{"200":{"description":"","content":{"application/json":{"schema":{"description":"`/api/v1/identities/` response.\n\nRepresents the identity created or updated, along with its flags.","type":"object","properties":{"identifier":{"type":"string","title":"Identifier"},"flags":{"type":"array","items":{"description":"Represents a single flag (feature state) returned by the Flagsmith SDK.","type":"object","properties":{"feature":{"description":"Represents a Flagsmith feature, defined at project level.","type":"object","properties":{"id":{"type":"integer","title":"Id"},"name":{"type":"string","title":"Name"},"type":{"allOf":[{"description":"* `STANDARD` - STANDARD\n* `MULTIVARIATE` - MULTIVARIATE","type":"string","enum":["STANDARD","MULTIVARIATE"],"title":"TypeD77Enum"}],"title":"Type"}},"required":["id","name","type"],"title":"Feature"},"enabled":{"type":"boolean","title":"Enabled"},"feature_state_value":{"anyOf":[{"type":"integer"},{"type":"boolean"},{"type":"string"},{"type":"null"}],"title":"Feature State Value"},"variant":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Variant"},"reason":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Reason"}},"required":["feature","enabled","feature_state_value"],"title":"V1Flag"},"title":"Flags"},"traits":{"type":"array","items":{"description":"Represents a key-value pair associated with an identity.","type":"object","properties":{"trait_key":{"type":"string","title":"Trait Key"},"trait_value":{"anyOf":[{"type":"integer"},{"type":"number"},{"type":"boolean"},{"type":"string"},{"type":"null"}],"title":"Trait Value"}},"required":["trait_key","trait_value"],"title":"Trait"},"title":"Traits"}},"required":["identifier","flags","traits"],"title":"V1IdentitiesResponse"}}}}}}
>
