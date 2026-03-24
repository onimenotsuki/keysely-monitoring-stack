import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";

export interface ResourceGroupResult {
  readonly name: pulumi.Output<string>;
  readonly location: pulumi.Output<string>;
  readonly resourceGroup: resources.ResourceGroup;
}

export function createResourceGroup(
  name: string,
  location: pulumi.Input<string>,
  tags: pulumi.Input<{ [key: string]: string }>,
): ResourceGroupResult {
  const resourceGroup = new resources.ResourceGroup(name, {
    location,
    tags,
  });

  return {
    name: resourceGroup.name,
    location: resourceGroup.location,
    resourceGroup,
  };
}
