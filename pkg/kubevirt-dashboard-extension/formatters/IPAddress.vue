<script>
import CopyToClipboard from '@shell/components/CopyToClipboard';
import { isIpv4 } from '@shell/utils/string';
import { VMI_RESOURCE_NAME } from '../constants';

const MANAGEMENT_NETWORK = 'Management Network';

export default {
  components: { CopyToClipboard },
  props: {
    value: {
      type: String,
      default: '',
    },
    row: {
      type: Object,
      required: true,
    },
    col: {
      type: Object,
      default(props) {
        return {};
      },
    },
  },

  computed: {
    // Return VM instance IP and VM annotation IP
    ips() {
      //   return [...this.vmiIp, ...this.networkAnnotationIP]
      return this.vmiIp.filter(Boolean).sort((a, b) => (a.ip < b.ip ? -1 : 1));
    },

    // networkAnnotationIP() {
    //   if (this.row.actualState !== 'Running') {
    //     // TODO: Running
    //     return [];
    //   }

    //   const annotationIp =
    //     get(this.row, `metadata.annotations."${HCI_ANNOTATIONS.NETWORK_IPS}"`) || '[]';

    //   // Obtain IP from VM annotation, remove the CIDR suffix number if CIDR Exist
    //   try {
    //     const out = JSON.parse(annotationIp);

    //     return out.map((ip) => ({
    //       ip: ip.replace(/\/[\d\D]*/, ''),
    //       name: '',
    //     }));
    //   } catch (e) {
    //     return [];
    //   }
    // },

    vmiIp() {
      const vmiResources = this.$store.getters['cluster/all'](VMI_RESOURCE_NAME);
      const resource = vmiResources.find((VMI) => VMI.id === this.value) || null;
      //   const networksName = this.row.networksName || [];
      const vmiNetworks = resource?.spec?.networks || [];

      return (resource?.status?.interfaces || [])
        .filter((intf) => {
          return isIpv4(intf.ipAddress); //&& networksName.includes(intf.name);
        })
        .map((intf) => {
          let name;
          const network = vmiNetworks.find((network) => network.name === intf.name);

          if (network && network.multus) {
            name = network.multus.networkName;
          } else if (network && network.pod) {
            name = MANAGEMENT_NETWORK;
          }

          return {
            ip: intf.ipAddress,
            name,
          };
        });
    },

    showIP() {
      return this.row.stateDisplay !== 'Stopped';
    },
  },
};
</script>

<template>
  <div v-if="showIP">
    <span v-for="{ ip, name } in ips" :key="ip">
      <span v-clean-tooltip="name">{{ ip }}</span>
      <CopyToClipboard
        :text="ip"
        label-as="tooltip"
        class="icon-btn"
        action-color="bg-transparent"
      />
    </span>
  </div>
  <span v-else-if="col.dashIfEmpty">
    <span class="text-muted">&mdash;</span>
  </span>
</template>
