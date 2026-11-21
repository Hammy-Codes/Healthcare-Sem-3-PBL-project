#include "../src/storage/store.hpp"
#include <cassert>
#include <cstdio>
#include <fstream>
#include <stdexcept>
#include <string>
#ifdef _WIN32
#include <windows.h>
#endif
int main(){
    const std::string root=CAREBRIDGE_TEST_STORAGE_DIR;
#ifdef _WIN32
    CreateDirectoryA(root.c_str(),0);
#else
    std::system("mkdir -p backend/build/storage-tests");
#endif
    const std::string file=root+"/records.json";std::remove(file.c_str());std::remove((file+".tmp").c_str());
    {carebridge::Store s(file);carebridge::Json p={{"id","patient-1"},{"user_id","user-1"},{"name","Synthetic Patient"}};s.insert("patients",p);assert(s.find("patients","patient-1").value("name",std::string())=="Synthetic Patient");p["name"]="Updated Patient";s.update("patients","patient-1",p);assert(s.find("patients","patient-1").value("name",std::string())=="Updated Patient");assert(s.erase("patients","patient-1"));assert(s.find("patients","patient-1").is_null());s.insert("patients",p);}
    {carebridge::Store s(file);assert(s.find("patients","patient-1").value("name",std::string())=="Updated Patient");}
    const std::string bad=root+"/malformed.json";{std::ofstream f(bad.c_str());f<<"{bad";}
    bool rejected=false;try{carebridge::Store s(bad);}catch(const std::runtime_error&){rejected=true;}assert(rejected);
    const std::string badRecord=root+"/bad-record.json";{std::ofstream f(badRecord.c_str());f<<"{\"patients\":[{\"id\":\"p1\"}]}";}
    rejected=false;try{carebridge::Store s(badRecord);}catch(const std::runtime_error&){rejected=true;}assert(rejected);
    const std::string legacy=root+"/legacy.json";{std::ofstream f(legacy.c_str());f<<"{\"patients\":[{\"id\":\"legacy-1\",\"user_id\":\"legacy-user\",\"name\":\"Synthetic Legacy\"}]}";}
    {carebridge::Store s(legacy);assert(s.find("patients","legacy-1").value("name",std::string())=="Synthetic Legacy");}
    {std::ifstream f(legacy.c_str());carebridge::Json upgraded;f>>upgraded;assert(upgraded.value("_schema_version",0)==1);assert(upgraded.contains("audit"));}
    return 0;
}
