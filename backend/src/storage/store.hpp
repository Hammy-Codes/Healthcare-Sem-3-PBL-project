#ifndef CAREBRIDGE_STORE_HPP
#define CAREBRIDGE_STORE_HPP
#include <fstream>
#include <mutex>
#include <random>
#include <sstream>
#include <set>
#include <initializer_list>
#include <stdexcept>
#include <string>
#include <ctime>
#include <iomanip>
#include "../../third_party/json.hpp"
#ifdef _WIN32
#include <windows.h>
#endif
namespace carebridge {
using Json=nlohmann::json;
inline std::string newId(){static const char h[]="0123456789abcdef";std::random_device rd;std::string s="cb-";for(int i=0;i<32;i++)s+=h[rd()%16];return s;}
inline std::string timestamp(){std::time_t t=std::time(NULL);std::tm *u=std::gmtime(&t);char b[32];std::strftime(b,sizeof b,"%Y-%m-%dT%H:%M:%SZ",u);return b;}
class Store {
    std::string path_; mutable std::mutex mutex_; Json db_;
    void saveLocked(){const std::string temp=path_+".tmp";{std::ofstream f(temp.c_str(),std::ios::binary|std::ios::trunc);if(!f)throw std::runtime_error("cannot write data file");f<<db_.dump(2);f.flush();if(!f)throw std::runtime_error("data file write failed");}
#ifdef _WIN32
        if(!MoveFileExA(temp.c_str(),path_.c_str(),MOVEFILE_REPLACE_EXISTING|MOVEFILE_WRITE_THROUGH)){DeleteFileA(temp.c_str());throw std::runtime_error("atomic data replacement failed");}
#else
        if(std::rename(temp.c_str(),path_.c_str())!=0){std::remove(temp.c_str());throw std::runtime_error("atomic data replacement failed");}
#endif
    }
    static bool validRecord(const std::string&bucket,const Json&v){
        const char*fields[8]={0,0,0,0,0,0,0,0};std::size_t n=0;
        if(bucket=="users"){fields[n++]="email";fields[n++]="full_name";fields[n++]="role";fields[n++]="password_hash";if(v.value("role",std::string())!="patient"&&v.value("role",std::string())!="doctor"&&v.value("role",std::string())!="lab_technician")return false;}
        else if(bucket=="patients"){fields[n++]="user_id";}
        else if(bucket=="appointments"){fields[n++]="patient_user_id";fields[n++]="patient_id";fields[n++]="doctor_id";fields[n++]="scheduled_at";fields[n++]="status";}
        else if(bucket=="symptoms"){fields[n++]="patient_id";fields[n++]="symptom_ids";fields[n++]="created_at";if(!v.value("symptom_ids",Json()).is_array())return false;}
        else if(bucket=="records"){fields[n++]="patient_id";fields[n++]="doctor_id";fields[n++]="record_type";fields[n++]="title";fields[n++]="content";}
        else if(bucket=="prescriptions"){fields[n++]="patient_id";fields[n++]="doctor_id";fields[n++]="filename";fields[n++]="content_type";fields[n++]="file_base64";}
        else if(bucket=="consents"){fields[n++]="patient_id";fields[n++]="doctor_id";fields[n++]="scope";fields[n++]="status";}
        else if(bucket=="lab_orders"){fields[n++]="patient_id";fields[n++]="doctor_id";fields[n++]="technician_id";fields[n++]="department";fields[n++]="test_name";fields[n++]="status";}
        else if(bucket=="lab_results"){fields[n++]="patient_id";fields[n++]="order_id";fields[n++]="technician_id";fields[n++]="test_name";fields[n++]="value";fields[n++]="unit";fields[n++]="timestamp";if(!v.value("value",Json()).is_number())return false;}
        else if(bucket=="vitals"){fields[n++]="patient_id";fields[n++]="recorded_at";}
        else if(bucket=="alerts"){fields[n++]="patient_id";fields[n++]="severity";fields[n++]="reason";fields[n++]="status";fields[n++]="created_at";}
        else if(bucket=="audit"){fields[n++]="actor_id";fields[n++]="actor_role";fields[n++]="action";fields[n++]="resource";fields[n++]="timestamp";fields[n++]="success";if(!v.value("success",Json()).is_boolean())return false;}
        for(std::size_t i=0;i<n;i++){if(!v.contains(fields[i]))return false;if(bucket=="symptoms"&&std::string(fields[i])=="symptom_ids"){if(!v[fields[i]].is_array())return false;continue;}if(bucket=="lab_results"&&std::string(fields[i])=="value"){if(!v[fields[i]].is_number())return false;continue;}if(bucket=="audit"&&std::string(fields[i])=="success"){if(!v[fields[i]].is_boolean())return false;continue;}if(!v[fields[i]].is_string()||v[fields[i]].get<std::string>().empty())return false;}
        return true;
    }
public:
    explicit Store(const std::string&p):path_(p),db_(Json::object()){
        std::ifstream f(path_.c_str(),std::ios::binary);const bool existed=f.is_open();if(existed){try{f>>db_;if(!db_.is_object())throw std::runtime_error("root must be object");}catch(const std::exception&e){throw std::runtime_error(std::string("invalid store file; refusing to overwrite: ")+e.what());}}
        bool changed=!existed;
        if(!db_.contains("_schema_version")){db_["_schema_version"]=1;changed=true;}else if(!db_["_schema_version"].is_number_integer()||db_["_schema_version"].get<int>()!=1)throw std::runtime_error("unsupported store schema version");
        const char* buckets[]={"users","patients","appointments","symptoms","records","prescriptions","consents","lab_orders","lab_results","vitals","alerts","audit"};for(std::size_t i=0;i<sizeof(buckets)/sizeof(*buckets);i++){if(!db_.contains(buckets[i])){db_[buckets[i]]=Json::array();changed=true;}else if(!db_[buckets[i]].is_array())throw std::runtime_error(std::string("store bucket must be an array: ")+buckets[i]);std::set<std::string>ids;for(const auto&v:db_[buckets[i]]){if(!v.is_object()||!v.contains("id")||!v["id"].is_string()||v["id"].get<std::string>().empty()||!validRecord(buckets[i],v))throw std::runtime_error(std::string("invalid record in bucket: ")+buckets[i]);if(!ids.insert(v["id"].get<std::string>()).second)throw std::runtime_error(std::string("duplicate record id in bucket: ")+buckets[i]);}}
        f.close();if(changed)saveLocked();
    }
    Json list(const std::string&bucket)const{std::lock_guard<std::mutex>l(mutex_);return db_.at(bucket);}
    Json find(const std::string&bucket,const std::string&id)const{std::lock_guard<std::mutex>l(mutex_);for(const auto&v:db_.at(bucket))if(v.value("id",std::string())==id)return v;return Json();}
    Json findAssignedLabOrder(const std::string&id,const std::string&technician,const std::string&department)const{std::lock_guard<std::mutex>l(mutex_);for(const auto&v:db_.at("lab_orders"))if(v.value("id",std::string())==id&&v.value("technician_id",std::string())==technician&&v.value("department",std::string())==department)return v;return Json();}
    void insert(const std::string&bucket,Json v){std::lock_guard<std::mutex>l(mutex_);if(v.value("id",std::string()).empty())v["id"]=newId();for(const auto&x:db_.at(bucket))if(x.value("id",std::string())==v["id"])throw std::runtime_error("duplicate identifier");db_[bucket].push_back(v);try{saveLocked();}catch(...){db_[bucket].erase(db_[bucket].end()-1);throw;}}
    void update(const std::string&bucket,const std::string&id,const Json&v){std::lock_guard<std::mutex>l(mutex_);for(auto&x:db_.at(bucket))if(x.value("id",std::string())==id){Json old=x,n=v;n["id"]=id;x=n;try{saveLocked();}catch(...){x=old;throw;}return;}throw std::runtime_error("record not found");}
    void updateAndInsertMany(const std::string&updateBucket,const std::string&id,const Json&updated,const std::string&insertBucket,const Json&rows){std::lock_guard<std::mutex>l(mutex_);if(!rows.is_array())throw std::invalid_argument("batch rows must be an array");Json*target=0;for(auto&x:db_.at(updateBucket))if(x.value("id",std::string())==id){target=&x;break;}if(!target)throw std::runtime_error("record not found");Json oldTarget=*target,oldRows=db_.at(insertBucket);std::set<std::string>ids;for(const auto&x:oldRows)ids.insert(x.value("id",std::string()));for(const auto&x:rows){std::string rid=x.value("id",std::string());if(rid.empty()||!ids.insert(rid).second)throw std::runtime_error("invalid or duplicate batch identifier");}Json replacement=updated;replacement["id"]=id;*target=replacement;for(const auto&x:rows)db_[insertBucket].push_back(x);try{saveLocked();}catch(...){*target=oldTarget;db_[insertBucket]=oldRows;throw;}}
    bool erase(const std::string&bucket,const std::string&id){std::lock_guard<std::mutex>l(mutex_);Json old=db_.at(bucket),a=Json::array();bool found=false;for(const auto&v:old){if(v.value("id",std::string())==id)found=true;else a.push_back(v);}if(found){db_[bucket]=a;try{saveLocked();}catch(...){db_[bucket]=old;throw;}}return found;}
    void audit(const std::string&actor,const std::string&role,const std::string&action,const std::string&resource,bool ok,const std::string&reason){Json e={{"id",newId()},{"actor_id",actor},{"actor_role",role},{"action",action},{"resource",resource},{"timestamp",timestamp()},{"success",ok},{"reason",reason}};insert("audit",e);}
};
}
#endif
