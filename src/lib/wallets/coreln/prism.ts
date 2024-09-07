import type {
  ListPrismsResponse,
  PrismType,
  PrismMember,
  ListPrismBindingsResponse,
  PrismBinding,
  PrismPayResponse,
  PrismMemberPayouts
} from '$lib/@types/plugins.js'
import type { PrismInterface } from '../interfaces.js'
import type { CorelnConnectionInterface } from './types.js'

class Prism implements PrismInterface {
  connection: CorelnConnectionInterface

  constructor(connection: CorelnConnectionInterface) {
    this.connection = connection
  }

  /* ----- 
  Prisms
  ----- */
  async listPrisms(): Promise<PrismType[]> {
    const { prisms } = (await this.connection.rpc({
      method: 'prism-list'
    })) as ListPrismsResponse
    return prisms
  }

  async createPrism(
    description: string,
    members: PrismMember[],
    outlay_factor: number
  ): Promise<PrismType> {
    console.log(`
      
      createPrism called!!
      
      `)

    console.log(`params = `, {
      description,
      members,
      outlay_factor
    })

    const prism = (await this.connection.rpc({
      method: 'prism-create',
      params: {
        description,
        members,
        outlay_factor
      }
    })) as PrismType
    return prism
  }

  async payPrism(prism_id: string, amount_msat: number): Promise<PrismMemberPayouts> {
    const { prism_member_payouts } = (await this.connection.rpc({
      method: 'prism-pay',
      params: {
        prism_id,
        amount_msat
      }
    })) as PrismPayResponse
    return prism_member_payouts
  }

  async deletePrism(prism_id: string): Promise<unknown> {
    const response = await this.connection.rpc({
      method: 'prism-delete',
      params: {
        prism_id
      }
    })
    return response
  }

  /* -----
  Bindings
  ----- */
  async listBindings(offer_id: string): Promise<PrismBinding[]> {
    const { bolt12_prism_bindings } = (await this.connection.rpc({
      method: 'prism-bindinglist',
      params: {
        offer_id
      }
    })) as ListPrismBindingsResponse
    return bolt12_prism_bindings
  }

  async createBinding(prism_id: string, offer_id: string): Promise<unknown> {
    const response = await this.connection.rpc({
      method: 'prism-bindingadd',
      params: {
        prism_id,
        offer_id
      }
    })
    return response
  }

  async updateBindingOutlay(
    offer_id: string,
    member_id: string,
    new_outlay_msat: number
  ): Promise<PrismBinding[]> {
    const { bolt12_prism_bindings } = (await this.connection.rpc({
      method: 'prism-setoutlay',
      params: {
        offer_id,
        member_id,
        new_outlay_msat
      }
    })) as ListPrismBindingsResponse
    return bolt12_prism_bindings
  }

  async deleteBinding(offer_id: string): Promise<unknown> {
    const response = (await this.connection.rpc({
      method: 'prism-bindingremove',
      params: {
        offer_id
      }
    })) as unknown
    return response
  }
}

export default Prism
