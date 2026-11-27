<Heading
  as={"h1"}
  className={"openapi__heading"}
  children={"sdk_v1_post_identities"}
>

<MethodEndpoint
  method={"post"}
  path={"/api/v1/identities/"}
  context={"endpoint"}
>
  

Identify a user, set their traits, and retrieve their flags.

<Heading
  id={"request"}
  as={"h2"}
  className={"openapi-tabs__heading"}
  children={"Request"}
>

<ParamsDetails
  parameters={undefined}
>
  

<RequestSchema
  title={"Body"}
  body={{"required":true,"content":{"application/json":{"schema":{"description":"`/api/v1/identities/` request.\n\nUsed to retrieve flags for an identity and store its traits.","type":"object","properties":{"identifier":{"type":"string","title":"Identifier"},"traits":{"anyOf":[{"items":{"description":"Represents a key-value pair trait provided as input when creating or updating an identity.","type":"object","properties":{"trait_key":{"type":"string","title":"Trait Key"},"trait_value":{"anyOf":[{"type":"integer"},{"type":"number"},{"type":"boolean"},{"type":"string"},{"type":"null"}],"title":"Trait Value"},"transient":{"anyOf":[{"type":"boolean"},{"type":"null"}],"title":"Transient"}},"required":["trait_key","trait_value"],"title":"TraitInput"},"type":"array"},{"type":"null"}],"title":"Traits"},"transient":{"anyOf":[{"type":"boolean"},{"type":"null"}],"title":"Transient"}},"required":["identifier"],"title":"V1IdentitiesRequest"}},"application/x-www-form-urlencoded":{"schema":{"description":"`/api/v1/identities/` request.\n\nUsed to retrieve flags for an identity and store its traits.","type":"object","properties":{"identifier":{"type":"string","title":"Identifier"},"traits":{"anyOf":[{"items":{"description":"Represents a key-value pair trait provided as input when creating or updating an identity.","type":"object","properties":{"trait_key":{"type":"string","title":"Trait Key"},"trait_value":{"anyOf":[{"type":"integer"},{"type":"number"},{"type":"boolean"},{"type":"string"},{"type":"null"}],"title":"Trait Value"},"transient":{"anyOf":[{"type":"boolean"},{"type":"null"}],"title":"Transient"}},"required":["trait_key","trait_value"],"title":"TraitInput"},"type":"array"},{"type":"null"}],"title":"Traits"},"transient":{"anyOf":[{"type":"boolean"},{"type":"null"}],"title":"Transient"}},"required":["identifier"],"title":"V1IdentitiesRequest"}},"multipart/form-data":{"schema":{"description":"`/api/v1/identities/` request.\n\nUsed to retrieve flags for an identity and store its traits.","type":"object","properties":{"identifier":{"type":"string","title":"Identifier"},"traits":{"anyOf":[{"items":{"description":"Represents a key-value pair trait provided as input when creating or updating an identity.","type":"object","properties":{"trait_key":{"type":"string","title":"Trait Key"},"trait_value":{"anyOf":[{"type":"integer"},{"type":"number"},{"type":"boolean"},{"type":"string"},{"type":"null"}],"title":"Trait Value"},"transient":{"anyOf":[{"type":"boolean"},{"type":"null"}],"title":"Transient"}},"required":["trait_key","trait_value"],"title":"TraitInput"},"type":"array"},{"type":"null"}],"title":"Traits"},"transient":{"anyOf":[{"type":"boolean"},{"type":"null"}],"title":"Transient"}},"required":["identifier"],"title":"V1IdentitiesRequest"}}}}}
>
  

<StatusCodes
  id={undefined}
  label={undefined}
  responses={{"200":{"description":"","content":{"application/json":{"schema":{"description":"`/api/v1/identities/` response.\n\nRepresents the identity created or updated, along with its flags.","type":"object","properties":{"identifier":{"type":"string","title":"Identifier"},"flags":{"type":"array","items":{"description":"Represents a single flag (feature state) returned by the Flagsmith SDK.","type":"object","properties":{"feature":{"description":"Represents a Flagsmith feature, defined at project level.","type":"object","properties":{"id":{"type":"integer","title":"Id"},"name":{"type":"string","title":"Name"},"type":{"allOf":[{"description":"* `STANDARD` - STANDARD\n* `MULTIVARIATE` - MULTIVARIATE","type":"string","enum":["STANDARD","MULTIVARIATE"],"title":"TypeD77Enum"}],"title":"Type"}},"required":["id","name","type"],"title":"Feature"},"enabled":{"type":"boolean","title":"Enabled"},"feature_state_value":{"anyOf":[{"type":"integer"},{"type":"boolean"},{"type":"string"},{"type":"null"}],"title":"Feature State Value"},"variant":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Variant"},"reason":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Reason"}},"required":["feature","enabled","feature_state_value"],"title":"V1Flag"},"title":"Flags"},"traits":{"type":"array","items":{"description":"Represents a key-value pair associated with an identity.","type":"object","properties":{"trait_key":{"type":"string","title":"Trait Key"},"trait_value":{"anyOf":[{"type":"integer"},{"type":"number"},{"type":"boolean"},{"type":"string"},{"type":"null"}],"title":"Trait Value"}},"required":["trait_key","trait_value"],"title":"Trait"},"title":"Traits"}},"required":["identifier","flags","traits"],"title":"V1IdentitiesResponse"}}}}}}
>
